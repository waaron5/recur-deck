// Command-line flags, for the three scripts the skill ships.
//
// All of them take the same shape of argument - a long flag and its value, like
// "--input run.json" - so they read them the same way, from here.

/**
 * Long flags and the values that follow them.
 *
 * A following flag is not this flag's value: "--input --out dir" is a mistake
 * to report, not a file called "--out".
 *
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const value = argv[i + 1];
    args[argv[i].slice(2)] = value && !value.startsWith('--') ? value : '';
  }
  return args;
}

module.exports = { parseArgs };
