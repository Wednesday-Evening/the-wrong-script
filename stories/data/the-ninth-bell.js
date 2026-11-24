/* =====================================================================
   THE NINTH BELL
   An original story for THE WRONG SCRIPT - The Stories.
   ---------------------------------------------------------------------
   Written for this project. Plain data only: the engine in
   assets/js/story-engine.js turns it into a page. No HTML, no CSS, no
   localStorage keys in here.

   Structure, for whoever maintains this next:
     - One night at Halversen Light, in five parts.
     - The hub is 'tower'. Four rooms can be visited before low water;
       the engine sends the reader to 'bell' when the night runs out.
     - Two substantially different routes: the record (log room) and the
       shore (boathouse and the causeway). Each gives different
       information about the same event, and the best ending needs both.
     - Flags: rule (1911 log), habit (1962 log), hask (Hask's pages),
       rope (tenth ring taken), ines_trust (told Ines the truth),
       chapel (walked out to Cauldry), close (read the ledger's last
       page).
     - Five endings: hour, silence, ledger, habit, relief.
   ===================================================================== */

window.TWS_STORY = {
  slug: 'the-ninth-bell',
  title: 'The Ninth Bell',
  subtitle: 'Halversen Light, the last relief keeper',
  start: 'arrival',
  budget: 4,
  endings: 5,

  scenes: {

    /* ---------- Part I: the relief ---------- */

    arrival: {
      chapter: 'I - The Relief',
      title: 'The boat',
      lines: [
        'The launch cuts its engine a hundred metres out and lets the swell carry you the rest of the way. Halversen Light stands on its rock with the lamp already lit, though the sun has not gone down.',
        { who: 'HASK', text: '"You are the relief." He says it the way a doctor says a diagnosis.' },
        { who: 'HASK', text: '"Three rules. Keep the light. Write what happens in the log. And if the bell starts, count to eight and stop counting."' },
        'You ask what happens at nine.',
        { who: 'HASK', text: '"Nobody has counted to nine."' },
        'Behind him, past the causeway, a bell the size of a door hangs from a frame of rusted iron. It is not moving. It is not still, either.'
      ],
      choices: [
        { label: 'Ask about the bell', note: 'He brought it up, not you.', to: 'arrival_bell', set: { asked: 1 } },
        { label: 'Take the keys and say nothing', note: 'It is one night. Weather and oil.', to: 'arrival_quiet', set: { quiet: 1 } },
        { label: 'Look past him, out at the point', note: 'Something is hanging off the bell.', to: 'arrival_look', set: { looked: 1 } }
      ]
    },

    arrival_bell: {
      chapter: 'I - The Relief',
      title: 'What he will not say',
      lines: [
        { who: 'HASK', text: '"Fog signal. The frame is rotten and the wind gets into it. That is all it is."' },
        'He does not look at it while he says this. He looks at the knot in the boat\'s painter, and then at his boots, and then at a point roughly where your shoulder is.',
        { who: 'HASK', text: '"I am on the six o\'clock. The log is in the second room. Do not skip a night."' }
      ],
      choices: [
        { label: 'Take the keys', to: 'tower', set: { keys: 1 } }
      ]
    },

    arrival_quiet: {
      chapter: 'I - The Relief',
      title: 'The keys',
      lines: [
        'You take the keys. They are warm, which is strange, because he has been holding them in the wind for the better part of an hour.',
        { who: 'HASK', text: '"Good. The last one asked questions."' },
        'He hands you a torch with a cracked lens and steps back into the launch before you can ask what the last one asked.'
      ],
      choices: [
        { label: 'Climb the steps to the tower', to: 'tower' }
      ]
    },

    arrival_look: {
      chapter: 'I - The Relief',
      title: 'The point',
      lines: [
        'You look past him, out to the point. The bell hangs in its frame with a rope coming off it, tarred and thick, running down into the water where the causeway stones disappear.',
        'The rope is taut.',
        { who: 'HASK', text: '"Do not." He has not turned round. "Whatever you are thinking. Do not."' },
        'He says it quietly, and then he is busy with the boat, and you are standing on wet iron with a bag and a set of warm keys.'
      ],
      choices: [
        { label: 'Climb the steps to the tower', to: 'tower' }
      ]
    },

    /* ---------- Part II: the light (hub) ---------- */

    tower: {
      chapter: 'II - The Light',
      title: 'Halversen Light',
      build: function (state) {
        var lines = [
          'The tower is four rooms stacked on a rock: oil store, log room, watch room, lamp. You climb because there is nothing else to do with a night.',
          'The tide is out further than it should be for the hour. The causeway to the point is dry all the way, which the chart in the oil store says is impossible.'
        ];

        if (state.visits === 0) {
          lines.push('Hask\'s launch is a smudge on the water. The log is waiting. The lamp wants checking. Out on the point, that rope is still tight.');
        } else if (state.visits < 4) {
          lines.push('The lamp turns. The sea keeps its distance. There is still time before low water.');
        } else {
          lines.push('The lamp turns. The causeway is dry to the last stone, and the sea has stopped pretending it is going anywhere.');
        }

        var choices = [
          { label: 'The log room', note: 'Six years of weather, and one address written hard enough to emboss the next page.', to: 'logroom', visit: true },
          { label: 'The lamp room', note: 'The mechanism, the brass plate, and a second rope.', to: 'lamp', visit: true },
          { label: 'The boathouse', note: 'Someone is working late, and it is not Hask.', to: 'shore', visit: true },
          { label: 'Walk the causeway to the point', note: 'Dry stone, all the way out. It will not be dry for long.', to: 'chapel', visit: true },
          { label: 'Turn in and let the night pass', note: 'Ends the story here.', to: 'ending_relief', quiet: true }
        ];

        if (state.visits >= 4) {
          choices = [{ label: 'Go down to the causeway and wait for the water', to: 'bell' }];
        }

        return { lines: lines, choices: choices };
      }
    },

    /* ---------- Part II-a: the record ---------- */

    logroom: {
      chapter: 'II - The Record',
      title: 'The log room',
      lines: [
        'Three ledgers on a shelf, a cold stove, and a smell of salt and pencil shavings. The newest book is open at today\'s date and already filled in: WIND SW. SEA MODERATE. NOTHING TO REPORT.',
        'Hask has written NOTHING TO REPORT every night for six years.',
        'The older books are fatter.'
      ],
      choices: [
        { label: '1911 - the year Cauldry went under', note: 'The first ledger, and the thinnest.', to: 'log_1911' },
        { label: '1962 - the year the causeway was cut', note: 'A hand that writes in the margins.', to: 'log_1962' },
        { label: 'Hask\'s pages, this month', note: 'The last entry is not four words long.', to: 'log_hask' },
        { label: 'Back to the stairs', to: 'tower', quiet: true }
      ]
    },

    log_1911: {
      chapter: 'II - The Record',
      title: '1911',
      set: { rule: 1 },
      lines: [
        'November 1911. The keeper writes in a hand that gets smaller as the page goes on.',
        '"The bell rang nine at low water. I rang the tenth from the shore frame and kept the lamp lit until dawn. The water stopped at the causeway stones. I have lost an hour and cannot say which one."',
        'A week later: "It took my father\'s hour instead of mine. He does not remember the summer. Do not answer the bell unless you are willing to pay for it."',
        'Someone has underlined the last six words twice, in a different pencil, a long time ago.'
      ],
      choices: [
        { label: 'Close the ledger', to: 'logroom' }
      ]
    },

    log_1962: {
      chapter: 'II - The Record',
      title: '1962',
      set: { habit: 1 },
      lines: [
        '"The causeway was cut this spring. Cauldry is off the maps and the bell stays on the point as a fog signal. Nobody asked the bell."',
        '"It rang nine on the fourteenth. The keeper on duty counted to eight, as instructed, and wrote that nothing happened. The boathouse went under at three in the morning. Nobody drowned. The keeper resigned in the morning."',
        'In the margin, in newer pencil: "Counting to eight is not a rule. It is a habit."'
      ],
      choices: [
        { label: 'Close the ledger', to: 'logroom' }
      ]
    },

    log_hask: {
      chapter: 'II - The Record',
      title: 'This month',
      set: { hask: 1, ines: 1 },
      lines: [
        'Hask\'s pages are short. Weather. Oil. Wind direction. Nothing else, for six years, in the same four words.',
        'The last page is not short. "It rang nine on Tuesday. I counted to eight and went to bed. In the morning the causeway was dry and the bell was wet. I am not staying for the third time."',
        'Underneath, pressed hard enough to emboss the next page: INES ROURKE - BOATYARD - ASK HER ABOUT THE HARBOUR BOOKS.'
      ],
      choices: [
        { label: 'Close the ledger', to: 'logroom' }
      ]
    },

    /* ---------- Part III-a: the lamp ---------- */

    lamp: {
      chapter: 'III - The Lamp',
      title: 'The lamp room',
      lines: [
        'Glass on all sides, hot enough to smell of dust, and the mechanism turning on its bath of mercury as though it has all the time in the world. Which, presumably, it does.',
        'Bolted to the rail outside is a second rope, tarred and thick, ending in a knot the size of your fist. It runs out toward the point. It is not attached to the bell.',
        'A brass plate under the bolt, polished bright by a hundred years of thumbs: THE TENTH RING.'
      ],
      choices: [
        { label: 'Take the rope', note: 'It is heavier than rope should be.', to: 'lamp_rope', set: { rope: 1 } },
        { label: 'Leave it bolted', note: 'A brass plate is not an instruction.', to: 'lamp_leave' },
        { label: 'Back to the stairs', to: 'tower', quiet: true }
      ]
    },

    lamp_rope: {
      chapter: 'III - The Lamp',
      title: 'The tenth ring',
      lines: [
        'The knot comes loose with a sound like a cough. You coil the rope and clip it to your belt, and your hip aches immediately, as though you had been carrying it for years.',
        'The lamp turns. For a moment the beam passes over the point, and the bell is very white, and then it is only a shape again.'
      ],
      choices: [
        { label: 'Back to the stairs', to: 'tower' }
      ]
    },

    lamp_leave: {
      chapter: 'III - The Lamp',
      title: 'The tenth ring',
      lines: [
        'You leave it bolted. The plate is warm under your thumb and you take your hand off it quickly, the way you would take your hand off a stove that is not lit.',
        'The lamp turns. Below, the causeway is dry to the last stone.'
      ],
      choices: [
        { label: 'Back to the stairs', to: 'tower' }
      ]
    },

    /* ---------- Part III-b: the shore ---------- */

    shore: {
      chapter: 'III - The Boathouse',
      title: 'Ines Rourke',
      lines: [
        'Corrugated iron, diesel, one bulb. Ines Rourke is rebuilding a carburettor on a bench and does not stop working for you.',
        { who: 'INES', text: '"You are the new one. Hask did not last either."' },
        { who: 'INES', text: '"He give you the rules? Keep the light. Write the log. Count to eight. He has been counting to eight for six years, and the water has been coming further up the causeway every winter."' },
        { who: 'INES', text: '"That bell has been paid in hours for a hundred years. My grandmother called it the town\'s rent."' }
      ],
      choices: [
        { label: 'Ask her what the bell is', note: 'She said the word rent, not weather.', to: 'shore_bell', set: { ines_story: 1 } },
        { label: 'Tell her what the 1911 log says', note: 'You read it. She should hear it.', to: 'shore_truth', requires: { rule: 1 }, set: { ines_trust: 1 } },
        { label: 'Say nothing about the log', note: 'She is a boat mechanic. It is one night.', to: 'shore_lie', set: { ines_trust: 0 } },
        { label: 'Back to the tower', to: 'tower', quiet: true }
      ]
    },

    shore_bell: {
      chapter: 'III - The Boathouse',
      title: 'The town\'s rent',
      lines: [
        { who: 'INES', text: '"It is a fog bell they hung after the village went under. That is the story. Everyone on this coast can tell it."' },
        { who: 'INES', text: '"The harbour office has the 1911 books. Nobody drowned. Forty-one names, all evacuated, all accounted for on the mainland by the Tuesday. My grandmother was nine and she remembered the boats, not the water."' },
        { who: 'INES', text: '"So the bell rings nine, someone loses an hour, and the sea stays out of the harbour mouth. You tell me which part of that is weather."' },
        'She fits a jet, checks it, and fits it again.'
      ],
      choices: [
        { label: 'Back to the bench', to: 'shore' }
      ]
    },

    shore_truth: {
      chapter: 'III - The Boathouse',
      title: 'What the keeper wrote',
      lines: [
        'You tell her what the 1911 keeper wrote. The tenth ring. The water stopping at the stones. The hour that went missing, and the father who could not remember the summer.',
        { who: 'INES', text: '"So it is in the book. Good. Then it is a debt, and debts can be closed."' },
        'She wipes her hands and gives you a key on a loop of orange twine. "Harbour office, back door. The books are in the second cabinet. And the ledger out on the point says what it costs to close it, if you have the nerve to read the last page."',
        'She goes back to the carburettor. "Do not tell Hask I gave you that."'
      ],
      choices: [
        { label: 'Back to the bench', to: 'shore' }
      ]
    },

    shore_lie: {
      chapter: 'III - The Boathouse',
      title: 'Nothing to report',
      lines: [
        'You say nothing about the log. She hears the nothing.',
        { who: 'INES', text: '"Right. You are Hask\'s, then." She fits a jet and does not look up again. "When it rings, count to eight. See how far that gets you."' },
        'The bulb hums. Somewhere outside, water moves over stone in a way that water should not have time to do tonight.'
      ],
      choices: [
        { label: 'Back to the bench', to: 'shore' }
      ]
    },

    /* ---------- Part IV: the point ---------- */

    chapel: {
      chapter: 'IV - The Point',
      title: 'Cauldry',
      set: { chapel: 1 },
      lines: [
        'The causeway is dry to the last stone, which the chart in the oil store says cannot happen at this hour. You walk out with the torch off, because the sky is doing enough.',
        'Cauldry is a floor and two walls. The bell hangs over what used to be the nave, in a frame of newer iron bolted to older stone. The rope from it goes down into the water on the harbour side.',
        'Under the bell, a brass ledger chained to the wall: names, dates, and beside each name an hour. Forty-one names. Forty-one hours. The last entry is 1911.',
        'Someone has oiled the chain recently. The oil is still bright.'
      ],
      choices: [
        { label: 'Read the last page', note: 'The page after 1911.', to: 'chapel_page', set: { ledger: 1 } },
        { label: 'Put your hand on the bell', note: 'It is right there.', to: 'chapel_bell' },
        { label: 'Back along the causeway', to: 'tower', quiet: true }
      ]
    },

    chapel_page: {
      chapter: 'IV - The Point',
      title: 'The last page',
      set: { close: 1 },
      lines: [
        'The last page is not a name. It is a sentence in a careful hand: "Cauldry was emptied before the water came. The bell has been paid ever since, to keep the sea out of the harbour mouth, and the harbour mouth is the only reason this coast has a town."',
        'Below it, in ink so fresh it has not settled into the brass: "If the lamp is dark when the tenth is rung, the bell answers itself and the debt closes. No hour is taken. Nobody has been brave enough to try."',
        'You read it twice. The second time, you notice the fresh ink is not signed, and that the chain has been oiled by someone who expected you to get this far.'
      ],
      choices: [
        { label: 'Step back under the bell', to: 'chapel' }
      ]
    },

    chapel_bell: {
      chapter: 'IV - The Point',
      title: 'Cold iron',
      lines: [
        'The bell is cold and slightly rough, like a stone that has been in the sea. When you take your hand away it is warm, and the warmth takes its time leaving your palm.',
        'Out past the harbour mouth the water is a flat grey, and the lamp at your back sweeps over it once every twelve seconds, and nothing about that is a comfort.'
      ],
      choices: [
        { label: 'Step back under the bell', to: 'chapel' }
      ]
    },

    /* ---------- Part V: low water ---------- */

    bell: {
      chapter: 'V - Low Water',
      title: 'The ninth',
      lines: [
        'It starts at low water, the way the log said it would: nine strokes, unhurried, spaced like a man taking his time over bad news.',
        'The water does not retreat. It comes up the causeway stones in a line, smooth and certain, and the lamp beam passes over it twice before you understand that it is not going to stop.',
        'On the point, the rope from the bell is no longer slack.'
      ],
      choices: [
        { label: 'Ring the tenth from the shore frame', note: 'The old way. The way that costs an hour.', to: 'ending_hour' },
        { label: 'Cut the bell\'s rope and let it hang', note: 'No rent. No hours. No help, either.', to: 'ending_silence', requires: { rope: 1 } },
        { label: 'Cut the bell down with the frame\'s own pin', note: 'You have seen how it is fixed.', to: 'ending_silence', requires: { chapel: 1 } },
        { label: 'Dark the lamp and ring from the point', note: 'The ledger says the bell answers itself. Nobody has been brave enough.', to: 'ending_ledger', requires: { rule: 1, close: 1 } },
        { label: 'Keep the light, count to eight, go to bed', note: 'It has held for six years.', to: 'ending_habit', requires: { habit: 1 } },
        { label: 'Keep the light and count to eight', note: 'Hask\'s rule, from the first minute.', to: 'ending_habit' }
      ]
    },

    /* ---------- endings ---------- */

    ending_hour: {
      chapter: 'The Last Watch',
      title: 'The Hour Given',
      ending: { name: 'The Hour Given', kind: 'uneasy' },
      lines: [
        'You take the tarred rope in both hands and pull. The tenth stroke goes out over the water and does not come back.',
        'The line of water stops at the causeway stones. It stays there, shivering, like something told to wait, and then it goes back down the stones the way it came, and the bell hangs still.',
        'In the morning the tide is where the chart says it should be. The lamp is out. Your watch says six, the clock in the oil store says seven, and neither of them is wrong.',
        'You write it in the log because that is the rule. WIND SW. SEA MODERATE. BELL RANG NINE. I RANG TEN. NOTHING TO REPORT.',
        'Underneath, in a hand that is not yours: PAID. ONE HOUR. And then, smaller: welcome to the roster.'
      ]
    },

    ending_silence: {
      chapter: 'The Last Watch',
      title: 'The Silence',
      ending: { name: 'The Silence', kind: 'bittersweet' },
      lines: [
        'You get to the bell before the tenth stroke, and it ends the same way it started: with your weight against a hundred years of somebody else\'s arrangement.',
        'The bell swings, catches, and hangs. The ninth stroke is the last one. The water comes over the causeway and takes the boathouse, the empty spit, and the last two walls of Cauldry, and then it stops at the harbour stones, because there is nothing left out there to take.',
        'Ines finds you at dawn, soaked to the knees, watching the place where the bell used to hang above the water.',
        { who: 'INES', text: '"No hours. No rent. Nothing out there now but a wet rock."' },
        'The town loses its ghost story. It keeps its fear of the sea, which is cheaper and probably better for everyone.',
        'The log for that night has one line, in your hand: BELL SILENCED. SEA TOOK THE POINT. NOBODY DROWNED.'
      ]
    },

    ending_ledger: {
      chapter: 'The Last Watch',
      title: 'The Ledger',
      ending: { name: 'The Ledger', kind: 'hopeful' },
      lines: [
        'You take the chapel rope in one hand, and with the other you put out the lamp. Then you do the thing nobody has been brave enough to try.',
        'For three seconds the point is only moonlight and the sound of the sea deciding.',
        'Then the bell answers itself. One stroke, low, from the inside of the frame. The rope goes slack in your hands. The water on the causeway stops as though it has been reminded of something it had agreed to a long time ago.',
        'You write the last line in the brass with the keeper\'s stylus, still in its clip: PAID IN FULL. NO HOUR TAKEN.',
        'Ines reads it at dawn with her thumb. Then she does something you have not seen her do. She laughs, once, at the sea.',
        'The harbour office closes the ledger in April. The bell comes down in June and hangs in the church at the top of the town, where it rings for weddings and funerals and nothing else, and nobody in either building has ever lost an hour.',
        'Hask writes to you once, from the mainland. Two lines. "You closed it. Good. I still cannot remember the summer I was eleven."'
      ]
    },

    ending_habit: {
      chapter: 'The Last Watch',
      title: 'The Habit',
      ending: { name: 'The Habit', kind: 'uneasy' },
      lines: [
        'You keep the light. You count to eight. You go to bed, because that is the rule, and because the rule has held for six years, and because it is cold on the stairs.',
        'At three in the morning the boathouse goes under. Nobody is in it. Ines\'s carburettor is in it, on the bench, half rebuilt.',
        'In the morning the causeway is dry and the bell is wet, and Hask\'s page is the last page in the book with anything on it.',
        'You leave on the six o\'clock. The relief after you is twenty-three and asks good questions.',
        'The log for your last night reads: COUNTED TO EIGHT. NOTHING TO REPORT. Which is true, and which is the whole problem.'
      ]
    },

    ending_relief: {
      chapter: 'The Last Watch',
      title: 'Relief',
      ending: { name: 'Relief', kind: 'quiet' },
      lines: [
        'You turn in early. The log gets a line, the light gets its oil, and the night passes the way nights do when someone else is on watch.',
        'At some point you hear nine strokes, or you dream nine strokes. In the morning the causeway is dry, the bell is wet, and there is salt on the inside of your window.',
        'The six o\'clock boat takes you off. The next relief is waiting on the quay with a kit bag and no questions.',
        'You never find out what the bell is for. That is allowed. Most people who come out here never do.'
      ]
    }
  }
};
