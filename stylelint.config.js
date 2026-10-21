/* stylelint for the game's CSS (openspec change react-typescript, task 1.7; design D7): colors come from the design
   system's tokens (var(--coral)), never a hex value or an rgb() color. The game's own CSS moves into app/src with each
   view from phase 4; today's math.css and css/ keep their rules until then. Fixtures: tools/eslint-rules/fixtures. */
export default {
  rules: {
    'color-no-hex': true,
    'function-disallowed-list': [['rgb', 'rgba', 'hsl', 'hsla'], { message: 'Use a design token (var(--...)), not a color function.' }],
  },
};
