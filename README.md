# Open block

Demo front end for a Columbia course finder. Plain HTML, CSS and JS, no build step.

## Files

- index.html: page markup
- styles.css: styles, light and dark mode
- data.js: sample courses, current schedule, requirement counts (all made up)
- app.js: query parser, filters, calendar, results, and `window.App` for the agent
- agent.js: assistant in the bottom-right corner

## Run

Open index.html in a browser, or serve the folder:

    python3 -m http.server 8000

## The assistant

Outside claude.ai the assistant runs in offline mode with keyword matching.
To use a real model, replace `callModel()` in agent.js with a call to your
backend. The tool definitions in `TOOLS` (get_schedule, search_courses,
add_course, preview_course, show_results) map onto function calling in most
LLM APIs, and each tool's `execute` already calls into `window.App`.

Keep your API key on the server, not in agent.js.
