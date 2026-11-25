/* =====================================================================
   THE WRONG SCRIPT - The Social Room: the boards
   ---------------------------------------------------------------------
   Data only. No DOM, no storage, no network. The renderer in
   social-room.js reads this and builds the page.

   Everything here is written by The Wrong Script Studio. There are no
   member posts, no comments, no reactions, no attendance and no counts
   of people, because none of those systems exist in this room.

   Entry shape:

     id       stable string, used as the element id and for deep links
     kind     the editorial label shown above the title
     title    the headline
     body     array of plain-text paragraphs
     note     optional small line (an honest caveat)
     status   optional, used by What's Happening only
     link     optional { label, href } pointing at a real local route

   Copy is plain text. It is inserted with textContent, so it can never
   become markup.
   ===================================================================== */

window.SOCIAL_ROOM = {
  areas: [
    {
      id: 'noticeboard',
      label: 'The Noticeboard',
      eyebrow: 'The Noticeboard',
      lede: 'Studio announcements, changes to the building, and things worth pointing at.',
      footnote: 'Every notice is written by the studio. Nothing on this board is a member post, and there is no way to add one.',
      entries: [
        {
          id: 'notice-reading-room',
          kind: 'Studio note',
          title: 'The Social Room opens as a reading room',
          body: [
            'The fourth room is open, and it is deliberately quiet. It holds four boards rather than a feed: notices, questions, invitations, and a short listing of what is happening in the building.',
            'Nothing here can be replied to, because there is nothing to reply with yet. The room is curated, read-only, and keeps no record of who visits it.'
          ],
          note: 'First version. Community features are not available, and no date is being promised for them.',
          link: { label: 'See the other rooms', href: '../' }
        },
        {
          id: 'notice-gallery-wall',
          kind: 'Update',
          title: 'Eight exhibits are on the Gallery wall',
          body: [
            'The Gallery opened with six shelves and eight demonstration exhibits, all made for this project and credited to The Wrong Script Studio.',
            'The room has no likes, no visitor count and no ranking. It is a wall you walk along, not a feed you keep up with.'
          ],
          link: { label: 'Visit The Gallery', href: '../gallery/' }
        },
        {
          id: 'notice-ninth-bell',
          kind: 'Featured discovery',
          title: 'A lighthouse that rings with nobody in the tower',
          body: [
            'The Ninth Bell is the first story on the Stories shelf: one night, one keeper, one bell that should be silent. It has five endings, and the shortest route to the water is not the one that explains the most.'
          ],
          link: { label: 'Read The Ninth Bell', href: '../stories/the-ninth-bell/' }
        },
        {
          id: 'notice-signal-path',
          kind: 'Editorial',
          title: 'Six levels, no timer',
          body: [
            'SIGNAL PATH was built to be finished rather than endured: no clock, no lives, no streak to protect, and a restart that costs nothing.',
            'The last grid is larger than the first, but the rule never changes. Collect every fragment, then walk to the beacon.'
          ],
          link: { label: 'Play SIGNAL PATH', href: '../arcade/signal-path/' }
        }
      ]
    },
    {
      id: 'open-questions',
      label: 'The Open Questions',
      eyebrow: 'The Open Questions',
      lede: 'Prompts to carry around. There is nowhere to answer them here, and that is intentional.',
      footnote: 'These are questions, not threads. No answers are collected, stored or shown, and none of them is a poll.',
      entries: [
        {
          id: 'question-who-writes',
          kind: 'Open question',
          title: 'Who is writing the script now?',
          body: [
            'The crew in the original film keep the production running without a script. At what point does improvisation become the new script, and who gets to decide that it has?'
          ],
          note: 'No answers are collected here.',
          link: { label: 'The Original Production', href: '../film/' }
        },
        {
          id: 'question-bell-meaning',
          kind: 'Open question',
          title: 'Is the bell a warning, or a habit?',
          body: [
            'A relief keeper spends one night at a lighthouse whose bell rings on its own. If nobody is pulling the rope, does the sound still mean that something is wrong?'
          ],
          note: 'No answers are collected here.',
          link: { label: 'The Ninth Bell', href: '../stories/the-ninth-bell/' }
        },
        {
          id: 'question-shortest-route',
          kind: 'Open question',
          title: 'What does the shortest route leave behind?',
          body: [
            'SIGNAL PATH will not open the beacon until every fragment is collected. The efficient path and the complete path are two different journeys through the same grid.'
          ],
          note: 'No answers are collected here.',
          link: { label: 'SIGNAL PATH', href: '../arcade/signal-path/' }
        },
        {
          id: 'question-drawn-place',
          kind: 'Open question',
          title: 'Does a place change when it is drawn?',
          body: [
            'The Gallery holds drawings of rooms that exist only in this universe. Does illustrating a place make it more real, or only more familiar?'
          ],
          note: 'No answers are collected here.',
          link: { label: 'The Gallery', href: '../gallery/' }
        }
      ]
    },
    {
      id: 'gathering-board',
      label: 'The Gathering Board',
      eyebrow: 'The Gathering Board',
      lede: 'Invitations and self-directed ideas. Nothing here is joined, submitted, scored or tracked.',
      footnote: 'These are invitations to try something on your own, not events with participants. No one has joined them, because there is no way to join.',
      entries: [
        {
          id: 'gathering-one-scene',
          kind: 'Invitation',
          title: 'One scene, starting mid-line',
          body: [
            'Take a single page and begin it the way the film does: somebody is already talking and the context never quite arrives. Keep it to one scene, and stop before it resolves.'
          ],
          note: 'Self-directed. Nothing is submitted or read by anyone.',
          link: { label: 'Open the film', href: '../film/' }
        },
        {
          id: 'gathering-no-undo',
          kind: 'Invitation',
          title: 'Finish a grid without undo',
          body: [
            'SIGNAL PATH keeps a move counter and an undo button. Pick any level and see how the route reads when the counter is the only record of it.'
          ],
          note: 'Self-directed. No scores are recorded anywhere.',
          link: { label: 'Open SIGNAL PATH', href: '../arcade/signal-path/' }
        },
        {
          id: 'gathering-two-shelves',
          kind: 'Idea',
          title: 'Two shelves, one wall',
          body: [
            'Choose two exhibits from different shelves in the Gallery and look for the thing they share: a colour, a habit of framing, a word that keeps returning.'
          ],
          note: 'Idea only. There is no thread to post the result in.',
          link: { label: 'Browse the shelves', href: '../gallery/' }
        },
        {
          id: 'gathering-read-twice',
          kind: 'Example',
          title: 'Read the same opening twice',
          body: [
            'Enter the film, read the first room, then leave and come back through a different door. The set is the same; what you notice is not.'
          ],
          note: 'An example of the kind of invitation this board will hold.',
          link: { label: 'Enter the film', href: '../film/' }
        }
      ]
    },
    {
      id: 'whats-happening',
      label: "What's Happening",
      eyebrow: "What's Happening",
      lede: 'A short editorial listing of the building. These are labels, not live event data.',
      footnote: 'These labels are editorial states, not live event data: no dates, deadlines, attendance figures or outcomes are recorded here, and nothing on this board is a live feed.',
      entries: [
        {
          id: 'happening-film',
          kind: 'Listing',
          status: 'Open now',
          title: 'The Original Production',
          body: ['The interactive film, in its own room: three routes, three endings, and a post-credits scene.'],
          link: { label: 'Enter the film', href: '../film/' }
        },
        {
          id: 'happening-stories',
          kind: 'Listing',
          status: 'Open now',
          title: 'The Stories, and The Ninth Bell',
          body: ['A library shelf with one complete story on it, readable from beginning to end.'],
          link: { label: 'Browse The Stories', href: '../stories/' }
        },
        {
          id: 'happening-arcade',
          kind: 'Listing',
          status: 'Open now',
          title: 'The Arcade, and SIGNAL PATH',
          body: ['One cabinet, one finished game, six handcrafted grids and no timer.'],
          link: { label: 'Visit The Arcade', href: '../arcade/' }
        },
        {
          id: 'happening-gallery',
          kind: 'Listing',
          status: 'Open now',
          title: 'The Gallery',
          body: ['Six shelves and eight demonstration exhibits, open to browse without an account.'],
          link: { label: 'Walk the wall', href: '../gallery/' }
        },
        {
          id: 'happening-archive',
          kind: 'Listing',
          status: 'In preparation',
          title: 'The Archive',
          body: ['The record: drafts, deleted scenes, and what this film used to be. Not built, and no date is being promised.']
        },
        {
          id: 'happening-creator-studio',
          kind: 'Listing',
          status: 'In preparation',
          title: 'The Creator Studio',
          body: ['Tools for making your own scenes in this universe. Not built, and no date is being promised.']
        }
      ]
    }
  ]
};
