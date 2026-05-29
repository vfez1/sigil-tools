import CONSTANTS from "../constants.mjs";

const Logger = {
  _showMessage: (logLevel, data) => {
    if (!logLevel || !data || typeof logLevel !== "string") {
      return false;
    }

    // const setting = game.settings.get(CONSTANTS.MODULE_NAME, "logLevel");
    const setting = CONFIG.debug.AA
      ? "DEBUG"
      : "INFO";
    const logLevels = ["DEBUG", "INFO", "WARN", "ERR", "OFF"];
    const logLevelIndex = logLevels.indexOf(logLevel.toUpperCase());
    if (setting == "OFF" || logLevelIndex === -1 || logLevelIndex < logLevels.indexOf(setting)) {
      return false;
    }
    return true;
  },
  log: (logLevel, ...data) => {
    if (!Logger._showMessage(logLevel, data)) {
      return;
    }

    logLevel = logLevel.toUpperCase();

    let msg = "No logging message provided.  Please see the payload for more information.";
    let payload = data.slice();
    if (data[0] && typeof (data[0] == "string")) {
      msg = data[0];
      if (data.length > 1) {
        payload = data.slice(1);
      } else {
        payload = null;
      }
    }
    msg = `${CONSTANTS.MODULE_NAME} | ${logLevel} > ${msg}`;
    switch (logLevel) {
      case "DEBUG":
        if (payload) {
          console.debug(msg, ...payload);        } else {
          console.debug(msg);        }
        break;
      case "INFO":
        if (payload) {
          console.info(msg, ...payload);        } else {
          console.info(msg);        }
        break;
      case "WARN":
        if (payload) {
          console.warn(msg, ...payload);        } else {
          console.warn(msg);        }
        break;
      case "ERR":
        if (payload) {
          console.error(msg, ...payload);        } else {
          console.error(msg);        }
        break;
      default:
        break;
    }
  },

  debug: (...data) => {
    Logger.log("DEBUG", ...data);
  },

  info: (...data) => {
    Logger.log("INFO", ...data);
  },

  warn: (...data) => {
    Logger.log("WARN", ...data);
  },

  error: (...data) => {
    Logger.log("ERR", ...data);
  },
};
export default Logger;
