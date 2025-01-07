const fs = require("fs");
const os = require("os");
const path = require("path");

const envFilePath = path.resolve(__dirname, "..", ".env");

// Helper function to parse a single line from .env
const parseLine = (line) => {
  const delimiterIndex = line.indexOf("=");
  if (delimiterIndex === -1) return null; // No `=` found, skip the line
  const key = line.substring(0, delimiterIndex).trim();
  const value = line.substring(delimiterIndex + 1).trim().replace(/^"|"$/g, ''); // Remove surrounding quotes
  return { key, value };
};

// Helper function to format a key-value pair for the .env file
const formatLine = (key, value) => `${key}="${value.replace(/"/g, '\\"')}"`; // Escape quotes

// Read .env file and convert to array
const readEnvVars = () => fs.readFileSync(envFilePath, "utf-8").split(os.EOL).filter(Boolean);

/**
 * Finds the key in .env files and returns the corresponding value
 *
 * @param {string} key Key to find
 * @returns {string|null} Value of the key
 */
const getDotEnvValue = (key) => {
  const envVars = readEnvVars();
  const matchedLine = envVars.find((line) => parseLine(line)?.key === key);
  const parsedLine = matchedLine ? parseLine(matchedLine) : null;
  return parsedLine ? parsedLine.value : null;
};

/**
 * Updates value for existing key or creates a new key=value line
 *
 * @param {string} key Key to update/insert
 * @param {string} value Value to update/insert
 */
const setDotEnvValue = (key, value) => {
  const envVars = readEnvVars();
  const targetLine = envVars.find((line) => parseLine(line)?.key === key);
  if (targetLine !== undefined) {
    // update existing line
    const targetLineIndex = envVars.indexOf(targetLine);
    envVars.splice(targetLineIndex, 1, formatLine(key, value));
  } else {
    // create new key-value
    envVars.push(formatLine(key, value));
  }
  // write everything back to the file system
  fs.writeFileSync(envFilePath, envVars.join(os.EOL));
};

/**
 * Converts the entire .env file into a JSON object
 *
 * @returns {Object} JSON representation of the .env file
 */
const getAllDotEnvAsJSON = () => {
  const envVars = readEnvVars();
  const envObj = {};
  envVars.forEach((line) => {
    const parsed = parseLine(line);
    if (parsed) {
      envObj[parsed.key] = parsed.value;
    }
  });
  return envObj;
};

/**
 * Writes a JSON object back to the .env file
 *
 * @param {Object} jsonObj JSON object with key-value pairs
 */
const writeJSONToDotEnv = (jsonObj) => {
  const envVars = Object.entries(jsonObj).map(([key, value]) => formatLine(key, value));
  fs.writeFileSync(envFilePath, envVars.join(os.EOL));
};

module.exports = { setDotEnvValue, getDotEnvValue, getAllDotEnvAsJSON, writeJSONToDotEnv };
