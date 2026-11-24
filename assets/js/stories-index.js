/* =====================================================================
   THE WRONG SCRIPT - The Stories: catalogue
   ---------------------------------------------------------------------
   The library page and any future page that needs to know what is on the
   shelf read this file. It is plain data, no logic.

   Rules this file follows, on purpose:
     - Only stories that actually work are listed. There is no "coming
       soon" card here, because a card that cannot be opened is a lie with
       a border around it.
     - The original production is NOT a story. It lives at /film/ and is
       reached from the Lobby. It must never be listed in this shelf.
     - Every field is display text. Nothing here is user data, and
       nothing here is invented community activity.

   To add a story in a later phase: write it under stories/<slug>/, then
   add one entry to the array below with status 'live' only once it can
   be read from beginning to at least one ending.
   ===================================================================== */

window.TWS_STORIES = [
  {
    slug: 'the-ninth-bell',
    number: 'Story 01',
    title: 'The Ninth Bell',
    subtitle: 'Halversen Light, the last relief keeper',
    status: 'live',
    statusLabel: 'Open',
    blurb: 'A relief keeper takes one night at a lighthouse where the bell is rung by something other than the wind. The village beyond the causeway was emptied a hundred years ago and the bell has been paid in hours ever since. You have until low water to decide what you are willing to spend.',
    labels: ['Folk mystery', 'Tidal', 'Two routes', 'Five endings', 'About 15 minutes'],
    note: 'Your progress is saved in this browser only. No account, no tracking.',
    saveKey: 'wrong-script.story.the-ninth-bell.v1'
  }
];
