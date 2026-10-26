/* What the Nikhilam Family helpers say (openspec family-helpers, design D1, D2, D8): LINES[friend][kind][band], each a
   list with one picked per use. Plain text with placeholders: {name} (the Nickname's two words), {title} (the Skill),
   {idea} (the first sentence of the Skill's idea), {sutra} (the Trick's Sutra, marked as Sanskrit), {meaning} (the
   Sutra's meaning), {wrong} (Shunya's playful wrong answer on the example, never the Player's question).
   Rules (test/family-lines.test.mjs): no em dashes and no digits; Early at most 8 words a sentence and 2 sentences,
   no {idea} or {meaning}, silly, gentle and always kind; Growing at most 14 words a sentence, playful; Fluent dry wit
   and real method talk. Friends are classmates who learned from Bolt, never teachers, and never give the answer.
   Text only until the owner's recording lands (design D13); every line is then recorded per friend and band. */
export const LINES = {
  shunya: {
    hello: {
      early: ['Hi, {name}! It is me, Shunya!', 'Hello, {name}! Shunya here!'],
      growing: ['Hey, {name}! Shunya here, the round one.', 'Hi, {name}! Shunya, reporting for snack duty. I mean math duty.'],
      fluent: ['Hello, {name}. Shunya here, small but well rounded.', 'Hi, {name}. Shunya. I contain multitudes, mostly nothing.']
    },
    nudge: {
      early: ['Psst! Want a little clue?'],
      growing: ['Psst, this one is sneaky. The idea: {idea}', 'Ooh, a tricky one! I peeked at the idea: {idea}'],
      fluent: ['A whisper from the back row: {idea}', 'Not to be a zero about it, but: {idea}']
    },
    nudgeEarly: {
      early: ['Psst! This one is sneaky.', 'Oops, tricky! I can show you one.'],
      growing: ['Psst, this one is sneaky. Want to see one with other numbers?', 'Tricky! Shall I show you one with different numbers?'],
      fluent: ['That one bites. Want a worked one on other numbers?', 'Even I would round that one off. Want an example?']
    },
    intro: {
      early: ['Let us do one together!', 'Watch us! Then you try.'],
      growing: ['Huddle up! We will do one with different numbers.', 'Team time! One example, different numbers, no peeking at yours.'],
      fluent: ['Group study. One example on other numbers, then it is yours.', 'Let us walk one through, on numbers that are not yours.']
    },
    mistake: {
      growing: ['Easy! It is {wrong}! Wait, is it?', 'I know, I know! {wrong}! Right? Right?'],
      fluent: ['Obviously {wrong}. I said obviously, so it must be right.', 'Quick answer: {wrong}. Quick, not necessarily correct.']
    },
    encourage: {
      early: ['You can do it! I just know it!', 'You are doing great!'],
      growing: ['You have got this. I believe in you more than in snacks.', 'Keep going! Every miss makes the next one easier.'],
      fluent: ['You are closer than it feels. Have another go.', 'Misses are just data. Yours is looking promising.']
    },
    cheer: {
      early: ['Yay! You did it!', 'Woohoo! Super job!'],
      growing: ['You did it! I am doing my happy roll!', 'Yes! That was zero percent luck!'],
      fluent: ['Nailed it. I am rolling with pride.', 'That is what we call a well rounded answer.']
    },
    leave: {
      early: ['Bye for now! Come back soon!', 'See you soon, friend!'],
      growing: ['That one was a toughie. Come back any time, we will be here.', 'Off you go! That Skill will be easier next time.'],
      fluent: ['Tough round. Come back to it fresh, it will keep.', 'Leaving is allowed. Coming back is encouraged.']
    }
  },
  nava: {
    hello: {
      early: ['Hi, {name}! I am Nava!', 'Hello, {name}! Nava says hi!'],
      growing: ['Hey, {name}! Nava here. Nine out of nine friends say hi.', 'Hi, {name}! Nava here, fresh from the back of the class.'],
      fluent: ['Hello, {name}. Nava. I nod a lot, it is my thing.', 'Hi, {name}. Nava here, with a comeback for every question.']
    },
    nudge: {
      early: ['Want a tiny clue? I have one!'],
      growing: ['Here is a clue, no charge: {idea}', 'Nod nod. Try this idea: {idea}'],
      fluent: ['Free tip, worth every penny: {idea}', 'I nod, therefore I hint: {idea}']
    },
    nudgeEarly: {
      early: ['Hmm, tricky! Want to see one?', 'Ooh! Shall we look at one together?'],
      growing: ['Hmm, tricky! Want to see one done with other numbers?', 'Stuck? Same, last week. Want to see one with other numbers?'],
      fluent: ['Stuck is a fine place to start. Want a worked one?', 'That one fights back. An example on other numbers?']
    },
    encourage: {
      early: ['You are so close! Try again!', 'Good trying! Keep going!'],
      growing: ['See? You were nearly there. Give it another go!', 'Do not worry, I needed three tries on that one too.'],
      fluent: ['That is the method. The rest is just you doing it.', 'Plot twist: you already know this. Go on.']
    },
    catch: {
      growing: ['Nope, Shunya! Count again. Eka, show us properly.', 'Nice try, Shunya! Not quite. Let Eka do it step by step.'],
      fluent: ['Confident, Shunya. Also wrong. Eka, take it from the top.', 'Shunya, that was bold and incorrect. Eka?']
    },
    outro: {
      early: ['Now you try yours!', 'Your turn! You can do it!'],
      growing: ['Same idea, your numbers. Go for it!', 'Your turn! Use the same steps on your question.'],
      fluent: ['Same steps, your numbers. Over to you.', 'Now apply it to yours. We will be nodding from here.']
    },
    cheer: {
      early: ['Hooray! You are a star!', 'Yes! High five!'],
      growing: ['Nine out of nine! That was brilliant!', 'Nod nod nod! You cracked it!'],
      fluent: ['Clean. Nava approves, with maximum nodding.', 'And that is how it is done. By you, no less.']
    },
    leave: {
      early: ['Bye bye! See you soon!', 'Come back soon! We will wait!'],
      growing: ['Taking a break? Smart move. See you next round!', 'Bye for now! That one will not win next time.'],
      fluent: ['A break is a strategy. See you later.', 'Off you go. The numbers will wait for you.']
    }
  },
  eka: {
    hello: {
      early: ['Hello, {name}. I am Eka.', 'Hi, {name}! Eka here.'],
      growing: ['Hello, {name}. Eka here. Let us look at this together.', 'Hi, {name}. Eka. I like steps, one at a time.'],
      fluent: ['Hello, {name}. Eka. Shall we take it step by step?', 'Hi, {name}. Eka here. Let us think it through.']
    },
    sutra: {
      growing: ['Bolt showed us this one. It is {sutra}: {meaning}.', 'This is {sutra}, from Bolt\'s lesson. It means: {meaning}.'],
      fluent: ['Bolt showed us this one: {sutra}, {meaning}. {idea}', 'The Sutra is {sutra}, {meaning}. In practice: {idea}']
    },
    method: {
      growing: ['Bolt showed us this one. {idea}', 'Here is how Bolt taught us: {idea}'],
      fluent: ['The method, as Bolt put it: {idea}', 'Think of it this way. {idea}']
    },
    methodEarly: {
      early: ['Bolt showed us this one. Look at Show me.', 'Let us look slowly. Tap Show me.'],
      growing: ['Bolt showed us this one. Tap Show me and I will do one.', 'Let us slow down. Show me works one with other numbers.'],
      fluent: ['Bolt showed us this one. Show me works an example.', 'Slow is smooth. Show me walks one through.']
    },
    steps: {
      early: ['Watch me do this one. Step by step.', 'Here is mine. One step at a time.'],
      growing: ['Same idea, different numbers. Here it is, step by step.', 'Watch the steps on my numbers, then use them on yours.'],
      fluent: ['Different numbers, same method. Each step:', 'Here it is on another problem. Watch the structure, not the numbers.']
    },
    remember: {
      early: ['This one was tricky last time too.', 'We know this one! It was tricky before.'],
      growing: ['Last time {title} was a tricky one. Look how far you have come.', 'We met {title} before. It was tough then too.'],
      fluent: ['{title} gave us trouble last time as well. Worth another look.', 'We have seen {title} trip us up before. Let us fix it properly.']
    },
    catch: {
      growing: ['Close, Shunya, but not quite. Let us check each step.', 'Hmm, Shunya, let us check that. Step by step.'],
      fluent: ['Shunya, let us test that instead of trusting it.', 'Good guess, Shunya. Guesses need checking. Watch.']
    },
    cheer: {
      early: ['You did it! I am so proud!', 'Well done! That was great!'],
      growing: ['Exactly right. You used the method. That is the whole point.', 'Well done. Bolt would be beaming.'],
      fluent: ['Correct, and by the method. That is the real win.', 'Well reasoned. That one is yours now.']
    }
  }
};
