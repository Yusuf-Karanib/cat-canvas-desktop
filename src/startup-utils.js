function loginLaunchOptions({ isPackaged, portableExecutableFile, execPath, appPath }) {
  if (isPackaged) {
    return {
      path: portableExecutableFile || execPath,
      args: ["--hidden"]
    };
  }
  return {
    path: execPath,
    args: [appPath, "--hidden"]
  };
}

module.exports = { loginLaunchOptions };
