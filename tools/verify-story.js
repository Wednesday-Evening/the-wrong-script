#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - The Stories: story structure verification
   ---------------------------------------------------------------------
   A development check, not part of the website. It loads each story's
   data file into a sandbox and walks the scene graph, so a broken link
   or an unreachable ending fails here rather than in a reader's browser.

   For every story it checks:

     1. the data file defines the contract the engine expects,
     2. every choice points at a scene that exists,
     3. every scene is reachable from the opening scene,
     4. every scene offers either a way on or an ending - no dead ends,
     5. every ending is reachable within the hour budget,
     6. every `requires` flag is set somewhere, so no choice is dead code,
     7. choice labels are unique within a scene and are readable,
     8. ending scenes carry a name and a kind,
     9. no story data carries HTML, a URL or another room's save key.

   Run from the repository root:

     node tools/verify-story.js

   Exit code 0 means every check passed.
   ===================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ ok: true, name: name });
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } catch (error) {
    results.push({ ok: false, name: name, detail: error.message });
    console.log('FAIL  ' + name + '  [' + error.message + ']');
  }
}

function loadStory(rel) {
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return sandbox.window.TWS_STORY;
}

const STORIES = [
  { slug: 'the-ninth-bell', data: 'stories/data/the-ninth-bell.js', page: 'stories/the-ninth-bell/index.html' },
  { slug: 'the-returns-hatch', data: 'stories/data/the-returns-hatch.js', page: 'stories/the-returns-hatch/index.html' }
];

/* Every scene id, flag and choice, collected once per story. */
function facts(story) {
  const ids = Object.keys(story.scenes);
  const flags = new Set();
  const targets = new Set();
  ids.forEach(function (id) {
    const scene = story.scenes[id];
    if (scene.set) { Object.keys(scene.set).forEach(function (k) { flags.add(k); }); }
    (scene.choices || []).forEach(function (choice) {
      if (choice.set) { Object.keys(choice.set).forEach(function (k) { flags.add(k); }); }
      if (choice.to) { targets.add(choice.to); }
    });
  });
  return { ids: ids, flags: Array.from(flags), targets: Array.from(targets) };
}

/* Walks the graph the way the engine does: entering a scene applies its
   `set` flags, a choice applies its own and may spend an hour. Returns
   what is reachable and how many hours the shortest route takes. */
function walk(story) {
  const flagIndex = {};
  facts(story).flags.forEach(function (f, i) { flagIndex[f] = i; });

  const start = story.start;
  const seen = new Set();
  const scenes = new Set();
  const endings = new Set();
  const hours = new Map();
  const queue = [];

  function maskAfterScene(sceneId, mask) {
    const scene = story.scenes[sceneId];
    let out = mask;
    if (scene.set) {
      Object.keys(scene.set).forEach(function (k) {
        if (scene.set[k]) { out |= (1 << flagIndex[k]); }
      });
    }
    return out;
  }

  queue.push({ scene: start, mask: 0, visits: 0 });
  hours.set(start, 0);

  while (queue.length) {
    const node = queue.shift();
    const mask = maskAfterScene(node.scene, node.mask);
    const key = node.scene + '|' + mask + '|' + node.visits;
    if (seen.has(key)) { continue; }
    seen.add(key);
    scenes.add(node.scene);

    const scene = story.scenes[node.scene];
    if (scene.ending) { endings.add(node.scene); }

    (scene.choices || []).forEach(function (choice) {
      if (!story.scenes[choice.to]) { return; }
      if (choice.requires) {
        const ok = Object.keys(choice.requires).every(function (flag) {
          const want = choice.requires[flag];
          const has = (mask & (1 << flagIndex[flag])) !== 0;
          return want === has;
        });
        if (!ok) { return; }
      }
      let nextMask = mask;
      if (choice.set) {
        Object.keys(choice.set).forEach(function (k) {
          if (choice.set[k]) { nextMask |= (1 << flagIndex[k]); }
        });
      }
      const nextVisits = node.visits + (choice.visit ? 1 : 0);
      if (nextVisits > 12) { return; }
      const prior = hours.get(choice.to);
      if (prior === undefined || nextVisits < prior) { hours.set(choice.to, nextVisits); }
      queue.push({ scene: choice.to, mask: nextMask, visits: nextVisits });
    });
  }

  return { scenes: scenes, endings: endings, hours: hours, states: seen.size };
}

STORIES.forEach(function (entry) {
  const story = loadStory(entry.data);

  check(entry.slug + ': the data file defines the engine contract', function () {
    if (!story) { throw new Error('window.TWS_STORY missing'); }
    ['slug', 'title', 'start', 'budget', 'endings', 'scenes'].forEach(function (field) {
      if (story[field] === undefined) { throw new Error('missing ' + field); }
    });
    if (story.slug !== entry.slug) {
      throw new Error('slug "' + story.slug + '" but the folder is "' + entry.slug + '"');
    }
    if (!Number.isInteger(story.budget) || story.budget < 1) {
      throw new Error('budget ' + story.budget);
    }
    if (!story.scenes[story.start]) { throw new Error('start scene "' + story.start + '" does not exist'); }
    return story.scenes ? Object.keys(story.scenes).length + ' scenes' : '';
  });

  check(entry.slug + ': every choice leads somewhere real', function () {
    const broken = [];
    Object.keys(story.scenes).forEach(function (id) {
      (story.scenes[id].choices || []).forEach(function (choice) {
        if (!choice.to) { broken.push(id + ': a choice has no destination'); return; }
        if (!story.scenes[choice.to]) { broken.push(id + ' -> ' + choice.to); }
      });
    });
    if (broken.length) { throw new Error(broken.join('; ')); }
    return 'all destinations exist';
  });

  check(entry.slug + ': no scene is a dead end', function () {
    const dead = Object.keys(story.scenes).filter(function (id) {
      const scene = story.scenes[id];
      return !scene.ending && !(scene.choices && scene.choices.length);
    });
    if (dead.length) { throw new Error('stranded: ' + dead.join(', ')); }
    return 'every scene continues or ends';
  });

  check(entry.slug + ': every scene is reachable from the opening', function () {
    const reached = walk(story).scenes;
    const unreached = Object.keys(story.scenes).filter(function (id) { return !reached.has(id); });
    if (unreached.length) { throw new Error('unreachable: ' + unreached.join(', ')); }
    return Object.keys(story.scenes).length + ' reachable';
  });

  check(entry.slug + ': every ending can be reached', function () {
    const endingScenes = Object.keys(story.scenes).filter(function (id) {
      return Boolean(story.scenes[id].ending);
    });
    const reached = walk(story).endings;
    const missed = endingScenes.filter(function (id) { return !reached.has(id); });
    if (missed.length) { throw new Error('cannot reach: ' + missed.join(', ')); }
    if (endingScenes.length !== story.endings) {
      throw new Error(endingScenes.length + ' ending scenes but the data claims ' + story.endings);
    }
    return endingScenes.length + ' endings reachable';
  });

  check(entry.slug + ': the ending count is honest', function () {
    const walkResult = walk(story);
    if (walkResult.endings.size !== story.endings) {
      throw new Error('reached ' + walkResult.endings.size + ' of ' + story.endings);
    }
    return walkResult.endings.size + ' of ' + story.endings;
  });

  check(entry.slug + ': endings carry a name and a kind', function () {
    const problems = [];
    Object.keys(story.scenes).forEach(function (id) {
      const ending = story.scenes[id].ending;
      if (!ending) { return; }
      if (!ending.name || typeof ending.name !== 'string') { problems.push(id + ': no name'); }
      if (!ending.kind || typeof ending.kind !== 'string') { problems.push(id + ': no kind'); }
    });
    if (problems.length) { throw new Error(problems.join('; ')); }
    return 'all named';
  });

  check(entry.slug + ': every required flag is actually set', function () {
    const known = facts(story).flags;
    const missing = [];
    Object.keys(story.scenes).forEach(function (id) {
      (story.scenes[id].choices || []).forEach(function (choice) {
        if (!choice.requires) { return; }
        Object.keys(choice.requires).forEach(function (flag) {
          if (known.indexOf(flag) === -1) { missing.push(id + ': ' + flag); }
        });
      });
    });
    if (missing.length) { throw new Error('never set: ' + missing.join(', ')); }
    return known.length + ' flags wired up';
  });

  check(entry.slug + ': choices are readable and distinct', function () {
    const problems = [];
    Object.keys(story.scenes).forEach(function (id) {
      const scene = story.scenes[id];
      const seen = new Set();
      (scene.choices || []).forEach(function (choice) {
        if (!choice.label || choice.label.trim().length < 4) {
          problems.push(id + ': a choice label is too short');
        }
        if (seen.has(choice.label)) { problems.push(id + ': duplicate label "' + choice.label + '"'); }
        seen.add(choice.label);
      });
    });
    if (problems.length) { throw new Error(problems.join('; ')); }
    return 'all labels usable';
  });

  check(entry.slug + ': the ending hours fit the night', function () {
    const walkResult = walk(story);
    const over = [];
    walkResult.endings.forEach(function (id) {
      const spent = walkResult.hours.get(id);
      if (spent === undefined) { return; }
      if (spent > story.budget) { over.push(id + ' needs ' + spent + ' of ' + story.budget); }
    });
    if (over.length) { throw new Error(over.join('; ')); }
    return 'shortest route to each ending is within ' + story.budget;
  });

  check(entry.slug + ': the data carries no markup, links or foreign keys', function () {
    const text = fs.readFileSync(path.join(ROOT, entry.data), 'utf8');
    if (/<[a-z/][^>]*>/i.test(text)) { throw new Error('HTML tag in story data'); }
    if (/https?:\/\//.test(text)) { throw new Error('external URL in story data'); }
    if (/\btws\b/.test(text)) { throw new Error('mentions the film save key'); }
    if (/wrong-script\.arcade\./.test(text)) { throw new Error('mentions an arcade save key'); }
    return 'plain text only';
  });

  check(entry.slug + ': the page loads its own story data', function () {
    const html = fs.readFileSync(path.join(ROOT, entry.page), 'utf8');
    const own = '../data/' + entry.slug + '.js';
    if (html.indexOf(own) === -1) { throw new Error('page does not load ' + own); }
    if (html.indexOf('story-engine.js') === -1) { throw new Error('page does not load the engine'); }
    if (/<h1/i.test(html) === false) { throw new Error('page has no heading'); }
    return own;
  });
});

/* The two stories must be genuinely different experiences. */
check('the stories are distinct works', function () {
  const a = loadStory('stories/data/the-ninth-bell.js');
  const b = loadStory('stories/data/the-returns-hatch.js');
  if (a.slug === b.slug) { throw new Error('same slug'); }
  if (a.title === b.title) { throw new Error('same title'); }
  if (a.start === b.start) { throw new Error('same opening scene'); }
  const shared = Object.keys(a.scenes).filter(function (id) { return Boolean(b.scenes[id]); });
  if (shared.length) { throw new Error('shared scene ids: ' + shared.join(', ')); }
  return a.title + ' vs ' + b.title;
});

check('the story catalogue lists both stories as live', function () {
  const source = fs.readFileSync(path.join(ROOT, 'assets/js/stories-index.js'), 'utf8');
  STORIES.forEach(function (entry) {
    if (source.indexOf("'" + entry.slug + "'") === -1) {
      throw new Error(entry.slug + ' is not on the shelf');
    }
  });
  const live = (source.match(/status: 'live'/g) || []).length;
  if (live < STORIES.length) { throw new Error(live + ' live entries for ' + STORIES.length + ' stories'); }
  return live + ' live entries';
});

const failed = results.filter(function (r) { return !r.ok; });
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' story checks passed');
if (failed.length) {
  console.log('RESULT story verification FAILED');
  process.exit(1);
}
console.log('RESULT story verification passed');
