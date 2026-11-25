/* =====================================================================
   THE RETURNS HATCH
   An original story for THE WRONG SCRIPT - The Stories.
   ---------------------------------------------------------------------
   Written for this project. Plain data only: the engine in
   assets/js/story-engine.js turns it into a page. No HTML, no CSS, no
   localStorage keys in here.

   Structure, for whoever maintains this next:
     - One night shift at Marrow Lane Branch, in three parts.
     - The hub is 'decide'. Three things can be looked at first: the
       ledger, the book, and Ivor. Each one sets a flag, and each one
       costs an hour of the night.
     - Two substantially different routes: the paper route (ledger and
       then the book) and the building route (Ivor and then whichever
       he sends you to). The best ending needs the book; the kindest
       needs Ivor.
     - Flags: knows_halloway (the ledger), knows_repair (the book),
       knows_ivor (the caretaker).
     - Five endings: filed, taken, rewritten, note, early.
     - No scene is called 'tower' or 'bell', and there is no 'bell'
       scene, so the engine's lighthouse special case never applies
       here. This story needs no engine change of any kind.
   ===================================================================== */

window.TWS_STORY = {
  slug: 'the-returns-hatch',
  title: 'The Returns Hatch',
  subtitle: 'Marrow Lane Branch, the small hours',
  start: 'hatch',
  budget: 4,
  endings: 5,

  scenes: {

    /* ---------- Part I: the first hour ---------- */

    hatch: {
      chapter: 'I - The First Hour',
      title: 'Twenty past eleven',
      lines: [
        'Marrow Lane Branch closes at six. By eleven the building has weather of its own: radiators ticking, the strip light over Biography hesitating, the smell of paper and floor polish and rain on a doormat that has never once dried.',
        'You are the night librarian. Four hours of it: shelve the trolley, walk the building twice, and mind the returns hatch, which stays open because the brass plate beside it says it stays open.',
        'At twenty past eleven the hatch clicks. Nothing comes through. Then the trolley, which was empty, has a book on it: green cloth, water-stained, no jacket. THE ALMANAC OF SMALL REPAIRS.',
        'It is not in the catalogue. There is a borrower card in the pocket, and the date stamped on it is forty years from tonight.'
      ],
      choices: [
        { label: 'Check the card against the borrower ledger', note: 'The drawer sticks, but it opens.', to: 'ledger', visit: true, set: { knows_halloway: 1 } },
        { label: 'Carry the book to the back office and read it', note: 'Nobody is going to miss you for an hour.', to: 'reading', visit: true, set: { knows_repair: 1 } },
        { label: 'Ring the bell for Ivor, the caretaker', note: 'He is somewhere below this floor.', to: 'ivor', visit: true, set: { knows_ivor: 1 } }
      ]
    },

    ledger: {
      chapter: 'I - The First Hour',
      title: 'Card 0417',
      lines: [
        'The ledger lives in a drawer that sticks. Borrowers are written in three hands and four inks, and the last entry in the current volume is from March.',
        'N. HALLOWAY. Card 0417. And then a date, forty years out, in the same pen as tonight\'s stamp.',
        'Under the name, in pencil, somebody has written a shelf mark: 643.2. The almanac shelf, third bay, the one that gets the damp.',
        'You check the card again under the desk lamp. It is not a forgery. It is simply early.'
      ],
      choices: [
        { label: 'Read the book itself', note: 'You have the hour.', to: 'reading', requires: { knows_repair: false }, visit: true, set: { knows_repair: 1 } },
        { label: 'Ask Ivor about card 0417', note: 'He has been here longer than the ledger.', to: 'ivor', requires: { knows_ivor: false }, visit: true, set: { knows_ivor: 1 } },
        { label: 'Take the book up to the desk and decide', to: 'decide' }
      ]
    },

    reading: {
      chapter: 'I - The First Hour',
      title: 'The almanac',
      lines: [
        'The almanac is a repair manual for things that were never built: a stair that remembers being a ladder, a door that only closes for one person, a lamp that wants its wick trimmed by somebody who has been told what the lamp is for.',
        'Every entry has a small drawing and a note on when the repair is finished. Not how. When.',
        'On the last page, in pencil: "For the branch. Do not catalogue it. It will not survive being catalogued."',
        'The handwriting is the same as the pencil shelf mark in the ledger, which you have not looked at yet, and which you will now want to.'
      ],
      choices: [
        { label: 'Compare the card with the ledger', note: 'The drawer sticks, but it opens.', to: 'ledger', requires: { knows_halloway: false }, visit: true, set: { knows_halloway: 1 } },
        { label: 'Ask Ivor about the last page', note: 'Somebody wrote that sentence on purpose.', to: 'ivor', requires: { knows_ivor: false }, visit: true, set: { knows_ivor: 1 } },
        { label: 'Take the book up to the desk and decide', to: 'decide' }
      ]
    },

    ivor: {
      chapter: 'I - The First Hour',
      title: 'Below the floor',
      lines: [
        'Ivor is in the basement with the boiler and a radio turned down to a murmur. He has been the caretaker here since before the computers, and he does not look surprised to see you holding a green book.',
        { who: 'IVOR', text: '"Halloway. Yes. She comes through that hatch about once a decade, and never when the building is full."' },
        { who: 'IVOR', text: '"She was a night librarian. She filed a book that was never meant to be filed, and the branch has been handing it back ever since. Not to her. To whoever is on."' },
        'He nods at the borrower card. "Put it where it wants to go. Or take it home. Or leave it for Aderyn on the morning desk. Those are the three honest things." He pauses. "The dishonest one is the catalogue."'
      ],
      choices: [
        { label: 'Compare the card with the ledger', note: 'See what the pencil says.', to: 'ledger', requires: { knows_halloway: false }, visit: true, set: { knows_halloway: 1 } },
        { label: 'Read the book itself', note: 'If it is not going in the catalogue, you want to know why.', to: 'reading', requires: { knows_repair: false }, visit: true, set: { knows_repair: 1 } },
        { label: 'Take the book up to the desk and decide', to: 'decide' }
      ]
    },

    /* ---------- Part II: the decision ---------- */

    decide: {
      chapter: 'II - The Third Hour',
      title: 'The desk',
      build: function (state) {
        var lines = [
          'The desk lamp makes a small warm room inside the large dark one. The book sits on the counter with its borrower card face up, forty years early.',
          'Whatever you do next, the hatch will still be open at six. That is the trouble with a rule written on a brass plate.'
        ];

        if (state.knows_halloway) {
          lines.push('Card 0417 belongs to a borrower who has not been born. That is either a clerical joke or a promise, and the ledger does not say which.');
        }

        if (state.knows_repair) {
          lines.push('The almanac repairs things by being finished with them. You have read enough of it to know it does not want a shelf.');
        }

        if (state.knows_ivor) {
          lines.push('Ivor gave you three honest things. He did not say what happens to the fourth.');
        }

        if (state.visits >= 3) {
          lines.push('It is nearly three. You have spent the quiet hours on one green book, and the building has not complained once.');
        }

        return { lines: lines };
      },
      lines: [
        'The desk lamp makes a small warm room inside the large dark one.',
        'Whatever you do next, the hatch will still be open at six.'
      ],
      choices: [
        { label: 'File it as a donation and go home', note: 'Accession it. Give it a shelf mark. Make it ordinary.', to: 'end_filed' },
        { label: 'Take it home in your bag', note: 'Nobody has asked for it in forty years.', to: 'end_taken' },
        { label: 'Write your own card and put it back on the almanac shelf', note: 'Lend it properly instead of filing it.', to: 'end_rewritten', requires: { knows_repair: true } },
        { label: 'Leave it on Aderyn\'s desk with a note', note: 'Hand it to the morning shift.', to: 'end_note', requires: { knows_ivor: true } },
        { label: 'Clock out an hour early and leave it on the trolley', note: 'Some nights you are just the night shift.', to: 'end_early', quiet: true }
      ]
    },

    /* ---------- Part III: five endings ---------- */

    end_filed: {
      chapter: 'III - The Fourth Hour',
      title: 'Accessioned',
      ending: { name: 'Accessioned', kind: 'A quiet ending' },
      lines: [
        'You type a record: ALMANAC OF SMALL REPAIRS. DONATION. PUBLISHER UNKNOWN. You give it a shelf mark and a barcode and a small plastic jacket, and you put it in the third bay where the pencil mark said it should go.',
        'In the morning Aderyn finds it catalogued and says it is nice to see the branch taking donations again.',
        'For eleven months it is a book on a shelf. Then the strip light over Biography stops hesitating, and the returns hatch clicks at twenty past eleven with nobody there, and you are not on shift to hear it.',
        'The card in the pocket is stamped forty years from that night. It always was.'
      ]
    },

    end_taken: {
      chapter: 'III - The Fourth Hour',
      title: 'Borrowed',
      ending: { name: 'Borrowed', kind: 'A private ending' },
      lines: [
        'You put it in your bag under your coat and clock out at six with a clean conscience and a bad shoulder.',
        'At home it does not repair anything. It is a book about repairs, and it sits on the table being a book, and you read it in the evenings the way you read anything.',
        'In the second week you notice the entry about the door that only closes for one person. In the third week you stop needing to read it to remember what it says.',
        'The branch does not miss it. The branch has four thousand other books and one less green one. You keep renewing it in your head, and nobody ever asks for it back.'
      ]
    },

    end_rewritten: {
      chapter: 'III - The Fourth Hour',
      title: 'Recatalogued',
      ending: { name: 'Recatalogued', kind: 'The hopeful ending' },
      lines: [
        'You take a blank card and write your own name on it, and tonight\'s date, and the shelf mark from the pencil: 643.2.',
        'Then you put the almanac back where it wants to go, between a repair manual for bicycles and a directory of vanished streets, and you leave the card face up on the desk so that whoever comes next can see it was borrowed properly.',
        'The hatch clicks once at twenty past eleven, and this time something does come through: a second card, blank, and a pencil stub worn down to the wood.',
        'In the morning the book is on the shelf, correctly carded, and the catalogue says it has been here since 1961. Aderyn says she does not remember ordering it. You say that is how the good ones arrive.',
        'That is the difference between filing a thing and lending it. One keeps it. The other lets it come back.'
      ]
    },

    end_note: {
      chapter: 'III - The Fourth Hour',
      title: 'For the morning desk',
      ending: { name: 'Handover', kind: 'A handover ending' },
      lines: [
        'You write a note: "Came through the hatch at 11.20. Card is early by forty years. Ivor says it is Halloway\'s. I have not catalogued it. - night shift."',
        'You leave the book on Aderyn\'s desk with the note under the card, squared to the edge of the blotter the way she likes things squared.',
        'At six the cleaner arrives, then Aderyn, who reads the note twice and then sits down slowly with the almanac open at the entry about the lamp.',
        'She does not put it on the trolley. She puts it in her bag. On your way out you hear her say, to nobody at all, "Right. So that is where you went."',
        'The hatch stays open. Somebody has to keep answering it.'
      ]
    },

    end_early: {
      chapter: 'III - The Fourth Hour',
      title: 'Clocked out',
      ending: { name: 'Clocked out', kind: 'A short ending' },
      lines: [
        'You leave it on the trolley, face down so you do not have to look at the card, and you clock out at five past five with the building still dark behind you.',
        'The walk home is cold and entirely ordinary. Nothing follows you. Nothing clicks.',
        'At six the morning staff find a green book on the trolley with no record and no card that matches any borrower in the system. It goes into the returns box, and the returns box goes into the stockroom.',
        'It will be there for a while. The hatch is patient. The hatch has forty years.'
      ]
    }

  }
};
