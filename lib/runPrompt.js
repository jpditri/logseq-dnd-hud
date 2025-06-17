const { execFile } = require('child_process');

/**
 * Execute a prompt file with a timeout. Resolves with the exit code or
 * rejects on failures such as spawn errors or timeouts.
 *
 * @param {string} file - Markdown prompt file to execute
 * @param {object} opts
 * @param {number} opts.timeout - Execution timeout in milliseconds
 * @returns {Promise<{ code: number }>}
 */
module.exports = function runPrompt(file, { timeout }) {
  return new Promise((resolve, reject) => {
    execFile('prompt-run', ['--in', file], { timeout }, (err) => {
      if (err) {
        if (err.killed) {
          const e = new Error('timeout');
          e.code = null;
          return reject(e);
        }
        // execFile uses err.code for the exit code when !== 0
        if (typeof err.code === 'number') {
          return resolve({ code: err.code });
        }
        return reject(err);
      }
      resolve({ code: 0 });
    });
  });
};
