#!/usr/bin/env bash
# One-time setup of the World boards for Learn Vedic Math (Firebase on Google Cloud; openspec change learnvedicmath D14).
# Safe to re-run: every step checks first and skips what already exists.
#
# Usage (from anywhere inside the repo):
#   bash cloud/setup.sh <project-id> [domain ...]
#   bash cloud/setup.sh learnvedicmath                  # domains default to learnvedicmath.com www.learnvedicmath.com
#   bash cloud/setup.sh --dry-run learnvedicmath        # print every command it would run; run and write nothing
#                                                       # (it checks nothing, so it shows every step as if the
#                                                       # project, its web app and its key were new)
#
# The domains become Firebase Auth's authorized domains (with localhost) and the reCAPTCHA Enterprise key's domains.
# Optional env: REGION (Firestore location, default nam5), BILLING_ACCOUNT (only used for a brand new project),
#               APP_CHECK=1 (also create a reCAPTCHA Enterprise key, register App Check and write the site key).
# The TTL policy on scores.exp (automatic deletion, design D14) needs the Blaze plan: switch the project to Blaze with
# a budget first (owner task 1.8).
# Needs: gcloud (Google Cloud CLI), Node.js with npx (for firebase-tools), curl, python3.

set -euo pipefail

CLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_JS="$CLOUD_DIR/../js/cloud-config.js"
DEFAULT_PROJECT="learnvedicmath"
REGION="${REGION:-nam5}"
APP_NAME="Learn Vedic Math web"

say()  { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

DRY=""
if [ "${1:-}" = "--dry-run" ]; then DRY=1; shift; fi
PROJECT_ARG="${1:-}"
if [ "$#" -gt 0 ]; then shift; fi
DOMAINS_WANT=("$@")
if [ "${#DOMAINS_WANT[@]}" -eq 0 ]; then DOMAINS_WANT=(learnvedicmath.com www.learnvedicmath.com); fi
for d in "${DOMAINS_WANT[@]}"; do
  [[ "$d" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "Not a domain: $d"
done
DOMAINS_CSV="$(IFS=,; echo "${DOMAINS_WANT[*]}")"

# Dry run: every command that would reach Google prints itself instead, and no file is written
if [ -n "$DRY" ]; then
  gcloud() { printf '+ gcloud %s\n' "$*" >&2; return 0; }
  curl() { printf '+ curl %s\n' "$*" | sed -E 's/Bearer [^ ]+/Bearer <token>/' >&2; printf '{}'; return 0; }
  fb() { printf '+ firebase %s\n' "$*" >&2; printf '{"result":[{"appId":"<app-id>","sdkConfig":{}}]}'; return 0; }
  info "Dry run for project ${PROJECT_ARG:-$DEFAULT_PROJECT}, domains $DOMAINS_CSV: commands are printed, nothing is run or written."
fi

# ---------- 1. Tools ----------
say "Checking tools"
command -v python3 >/dev/null 2>&1 || die "python3 not found."
if [ -n "$DRY" ]; then
  FB=(fb)
else
  command -v gcloud >/dev/null 2>&1 || die "gcloud not found. Install the Google Cloud CLI: https://cloud.google.com/sdk/docs/install"
  command -v curl >/dev/null 2>&1 || die "curl not found."
  if command -v firebase >/dev/null 2>&1; then
    FB=(firebase)
  elif command -v npx >/dev/null 2>&1; then
    FB=(npx --yes firebase-tools@latest)
  else
    die "Neither firebase nor npx found. Install Node.js (https://nodejs.org) or run: npm i -g firebase-tools"
  fi
  info "gcloud: $(gcloud --version 2>/dev/null | head -n1)"
  info "firebase-tools: $("${FB[@]}" --version)"
fi

# ---------- 2. Sign in ----------
say "Checking sign-in"
if [ -z "$DRY" ]; then
  if [ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null)" ]; then
    info "A browser window will open: sign in to Google Cloud with the account that should own the project."
    gcloud auth login
  fi
  info "gcloud account: $(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
  if ! "${FB[@]}" projects:list >/dev/null 2>&1; then
    info "A browser window will open: sign in to Firebase with the same Google account."
    "${FB[@]}" login
  fi
fi

# ---------- 3. Project ----------
PROJECT_ID="${PROJECT_ARG:-${PROJECT_ID:-}}"
if [ -z "$PROJECT_ID" ]; then
  if [ -t 0 ] && [ -z "$DRY" ]; then
    read -r -p "Google Cloud project id [$DEFAULT_PROJECT]: " PROJECT_ID
  fi
  PROJECT_ID="${PROJECT_ID:-$DEFAULT_PROJECT}"
fi
[[ "$PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || die "Invalid project id '$PROJECT_ID' (6 to 30 chars: lowercase letters, digits, hyphens)."

say "Project $PROJECT_ID"
if [ -z "$DRY" ] && gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  info "Project exists."
else
  info "Creating project (project ids are global: if this fails, pick another id)."
  gcloud projects create "$PROJECT_ID" --name="Learn Vedic Math"
  if [ -n "${BILLING_ACCOUNT:-}" ] || [ -n "$DRY" ]; then
    gcloud billing projects link "$PROJECT_ID" --billing-account="${BILLING_ACCOUNT:-<billing-account>}"
  fi
fi

say "Enabling required APIs (first run can take a minute)"
gcloud services enable firebase.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com \
  firebaserules.googleapis.com serviceusage.googleapis.com --project "$PROJECT_ID"

say "Adding Firebase to the project"
if [ -z "$DRY" ] && "${FB[@]}" projects:list --json 2>/dev/null | grep -q "\"projectId\": *\"$PROJECT_ID\""; then
  info "Firebase already enabled."
else
  "${FB[@]}" projects:addfirebase "$PROJECT_ID" >/dev/null
fi

# ---------- 4. Firestore ----------
say "Firestore database"
if [ -z "$DRY" ] && gcloud firestore databases describe --database='(default)' --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Database (default) exists."
else
  info "Creating Firestore (native mode) in $REGION."
  gcloud firestore databases create --database='(default)' --location="$REGION" --type=firestore-native --project "$PROJECT_ID"
fi

# ---------- 5. Anonymous sign-in and authorized domains ----------
say "Enabling Anonymous sign-in and authorized domains"
TOKEN="$(gcloud auth print-access-token)"
[ -z "$DRY" ] || TOKEN="<token>"
API="https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID"
HDR=(-H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json")

if ! CURRENT="$(curl -sS -f "${HDR[@]}" "$API/config")"; then
  die "Firebase Authentication is not initialized yet. Open
    https://console.firebase.google.com/project/$PROJECT_ID/authentication
  click Get started once (no need to pick a provider), then re-run this script."
fi
# localhost and the given domains; Firebase's own hosting domains are kept; any other domain (such as an old site) goes
DOMAINS="$(printf '%s' "$CURRENT" | python3 -c '
import json, sys
cfg = json.load(sys.stdin)
want = ["localhost"] + sys.argv[1].split(",")
have = [d for d in cfg.get("authorizedDomains", []) if d in want or d.endswith((".firebaseapp.com", ".web.app"))]
print(json.dumps(have + [d for d in want if d not in have]))' "$DOMAINS_CSV")"
BODY="{\"signIn\":{\"anonymous\":{\"enabled\":true}},\"authorizedDomains\":$DOMAINS}"
curl -sS -f -o /dev/null -X PATCH "${HDR[@]}" "$API/config?updateMask=signIn.anonymous.enabled,authorizedDomains" -d "$BODY" >/dev/null \
  || die "Could not update the Auth config."
info "Anonymous sign-in on. Authorized domains: $DOMAINS"

# ---------- 6. Rules and indexes ----------
say "Deploying Firestore rules and indexes"
( cd "$CLOUD_DIR" && "${FB[@]}" deploy --only firestore:rules,firestore:indexes --project "$PROJECT_ID" --non-interactive >/dev/null )

# ---------- 7. Web app and config ----------
say "Firebase web app"
APP_ID="$("${FB[@]}" apps:list WEB --project "$PROJECT_ID" --json | python3 -c '
import json, sys
apps = json.load(sys.stdin).get("result", [])
print(apps[0]["appId"] if apps else "")')"
if [ -z "$APP_ID" ] || [ -n "$DRY" ]; then
  info "Creating web app '$APP_NAME'."
  "${FB[@]}" apps:create WEB "$APP_NAME" --project "$PROJECT_ID" >/dev/null
  APP_ID="$("${FB[@]}" apps:list WEB --project "$PROJECT_ID" --json | python3 -c '
import json, sys
print(json.load(sys.stdin)["result"][0]["appId"])')"
else
  info "Using web app $APP_ID."
fi

say "Writing the web config to js/cloud-config.js"
SDKCONFIG="$("${FB[@]}" apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json)"
if [ -z "$DRY" ]; then
  printf '%s' "$SDKCONFIG" | python3 -c '
import json, re, sys
path = sys.argv[1]
data = json.load(sys.stdin)["result"]
cfg = data.get("sdkConfig", data)
keys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]
cfg = {k: cfg[k] for k in keys if cfg.get(k)}
src = open(path, encoding="utf-8").read()
body = ",\n".join(f"  {k}: {json.dumps(v)}" for k, v in cfg.items())
# Replace only the FIREBASE export; keep the comments and the App Check settings below it.
old = re.search(r"export const FIREBASE = (?:null|\{.*?\});", src, flags=re.S)
old_project = re.search(r"projectId:\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]", old.group(0)) if old else None
new, n = re.subn(r"export const FIREBASE = (?:null|\{.*?\});", lambda _: f"export const FIREBASE = {{\n{body}\n}};", src, count=1, flags=re.S)
if n != 1: sys.exit("Could not find export const FIREBASE in " + path)
# Another project: the old App Check key is not registered for this web app, so it goes (APP_CHECK=1 writes a new one)
if old_project and cfg.get("projectId") and old_project.group(1) != cfg["projectId"]:
    new, n = re.subn(r"export const appCheckSiteKey = [^;]*;", "export const appCheckSiteKey = \"\";", new, count=1)
    if n != 1: sys.exit("Could not find appCheckSiteKey in " + path)
open(path, "w", encoding="utf-8").write(new)
' "$CONFIG_JS"
  cat "$CONFIG_JS"
fi

# ---------- 8. Automatic deletion (TTL; needs the Blaze plan) ----------
say "Turning on automatic deletion of expired World board entries (TTL on the exp field)"
if [ -z "$DRY" ] && gcloud firestore fields ttls list --collection-group=scores --project "$PROJECT_ID" --format='value(name)' 2>/dev/null | grep -q '/fields/exp$'; then
  info "TTL policy on scores.exp already exists."
else
  gcloud firestore fields ttls update exp --collection-group=scores --enable-ttl --async --project "$PROJECT_ID" \
    || die "Could not set the TTL policy (it needs the Blaze plan). Set it in the console: Firestore > Time-to-live > collection group scores, field exp."
  # Asynchronous: building the policy can take a while, so the script does not wait. It is active when this shows ACTIVE:
  info "TTL policy requested. It takes a while to build; check that it reaches ACTIVE with:"
  info "  gcloud firestore fields ttls list --collection-group=scores --project $PROJECT_ID"
fi

# ---------- 9. App Check (optional: APP_CHECK=1) ----------
APP_CHECK_KEY=""
if [ "${APP_CHECK:-}" = "1" ]; then
  say "App Check with reCAPTCHA Enterprise"
  gcloud services enable recaptchaenterprise.googleapis.com firebaseappcheck.googleapis.com --project "$PROJECT_ID"
  KEY_NAME="$(gcloud recaptcha keys list --project "$PROJECT_ID" --filter="displayName='Learn Vedic Math App Check'" --format='value(name)' 2>/dev/null | head -n1)"
  if [ -z "$KEY_NAME" ]; then
    info "Creating a reCAPTCHA Enterprise score key for $DOMAINS_CSV (localhost uses App Check debug tokens instead)."
    KEY_NAME="$(gcloud recaptcha keys create --display-name="Learn Vedic Math App Check" --web --integration-type=score \
      --domains="$DOMAINS_CSV" --project "$PROJECT_ID" --format='value(name)')"
  else
    # A re-run with other domains: the key must allow exactly these, or App Check fails on the new site
    info "Using reCAPTCHA key ${KEY_NAME##*/}; setting its domains to $DOMAINS_CSV."
    gcloud recaptcha keys update "${KEY_NAME##*/}" --web --domains="$DOMAINS_CSV" --project "$PROJECT_ID" \
      || die "Could not update the reCAPTCHA key's domains. Set them in https://console.cloud.google.com/security/recaptcha?project=$PROJECT_ID"
  fi
  APP_CHECK_KEY="${KEY_NAME##*/}"
  [ -z "$DRY" ] || APP_CHECK_KEY="<site-key>"
  [ -n "$APP_CHECK_KEY" ] || die "Could not create or find the reCAPTCHA key."
  info "Registering the web app with App Check (key $APP_CHECK_KEY)."
  TOKEN="$(gcloud auth print-access-token)"
  [ -z "$DRY" ] || TOKEN="<token>"
  curl -sS -f -o /dev/null -X PATCH -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
    "https://firebaseappcheck.googleapis.com/v1/projects/$PROJECT_ID/apps/$APP_ID/recaptchaEnterpriseConfig?updateMask=siteKey" \
    -d "{\"siteKey\":\"$APP_CHECK_KEY\"}" >/dev/null \
    || die "Could not register App Check. Do it in https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
  if [ -z "$DRY" ]; then
    python3 -c '
import re, sys
path, key = sys.argv[1], sys.argv[2]
src = open(path, encoding="utf-8").read()
src, n = re.subn(r"export const appCheckSiteKey = [^;]*;", f"export const appCheckSiteKey = \"{key}\";", src, count=1)
src = re.sub(r"export const appCheckProvider = [^;]*;", "export const appCheckProvider = \"enterprise\";", src, count=1)
if n != 1: sys.exit("Could not find appCheckSiteKey in " + path)
open(path, "w", encoding="utf-8").write(src)
' "$CONFIG_JS" "$APP_CHECK_KEY"
  fi
  [ -n "$DRY" ] || info "Wrote appCheckSiteKey to js/cloud-config.js. Enforcement stays OFF until you turn it on (owner task 8.7)."
fi

# ---------- 10. Done ----------
say "Done. World boards are configured for $PROJECT_ID ($DOMAINS_CSV)."
if [ -n "$DRY" ]; then exit 0; fi
REFERRERS="$(printf 'https://%s/*, ' "${DOMAINS_WANT[@]}")"
cat <<NEXT

Next steps (owner guide, docs/owner-setup-learnvedicmath.md):
  1. Review the config the script wrote (public by design) and open a pull request with it:
       git add js/cloud-config.js && git commit -m "World boards: the $PROJECT_ID Firebase project"
  2. Restrict the browser API key to the referrers ${REFERRERS}http://localhost:*/* and http://127.0.0.1:*/*,
     and to the APIs it uses.
  3. After the deploy, open https://${DOMAINS_WANT[0]}/play/ as a Player 13 or older, play an Arena round, and check
     the World board. Data appears in: https://console.firebase.google.com/project/$PROJECT_ID/firestore

Hardening:
  - App Check (blocks scripted writes from outside the site). $( [ -n "$APP_CHECK_KEY" ] && echo "Registered with key $APP_CHECK_KEY." || echo "Not set up: re-run with APP_CHECK=1, or follow cloud/README.md (App Check).")
      After publishing the key, watch https://console.firebase.google.com/project/$PROJECT_ID/appcheck
      for a few days, then click Enforce for Cloud Firestore (and Authentication).
      Local testing: open the site on localhost and add the debug token it prints under Manage debug tokens.
  - Billing budget alert (Blaze plan):
      gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT_ID \\
        --display-name="Learn Vedic Math budget" --budget-amount=5USD \\
        --filter-projects=projects/$PROJECT_ID \\
        --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
      (find the account id with: gcloud billing accounts list)
NEXT
