import { DebugLevel, DebugConfig } from "../types";

export const settings: { debug: DebugConfig } = {
  debug: {
    enabled: false,
    level: "INFO",
  },
};

// テスト用のリセット関数
export const resetDebugSettings = () => {
  settings.debug.enabled = false;
  settings.debug.level = "INFO";
};

let lastLogTimestamp = 0;

// ログレベルの優先度
const LOG_LEVELS: Record<DebugLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

// 環境検出
const isBrowser = typeof window !== "undefined";
const isNode = typeof process !== "undefined" && process.versions?.node;

// Node.js環境でのANSIカラーコード
const ANSI_COLORS: Record<DebugLevel, string> = {
  ERROR: "\x1b[31m", // 赤
  WARN: "\x1b[33m", // 黄
  INFO: "\x1b[34m", // 青
  DEBUG: "\x1b[32m", // 緑
  TRACE: "\x1b[90m", // グレー
};

const ANSI_RESET = "\x1b[0m";

// ブラウザ環境でのCSSスタイル
const CSS_STYLES: Record<DebugLevel, string> = {
  ERROR: "color: #ff4444; font-weight: bold;",
  WARN: "color: #ffaa00; font-weight: bold;",
  INFO: "color: #4488ff; font-weight: bold;",
  DEBUG: "color: #44aa44; font-weight: bold;",
  TRACE: "color: #888888; font-weight: bold;",
};

const GRAY_STYLE = "color: #888888;";

// スタックトレースを解析して呼び出し元を取得
const getCallerInfo = (): string => {
  const stack = new Error().stack;
  if (!stack) return "unknown";

  const lines = stack.split("\n");
  // 最初の3行はError、getCallerInfo、debug関数なのでスキップ
  const callerLine = lines[3];

  if (!callerLine) return "unknown";

  // Vite環境のパターン: @filename.js?v=hash:line:column
  const viteMatch = callerLine.match(/@([^?]+)(?:\?[^:]*)?:(\d+):(\d+)/);
  if (viteMatch) {
    const [, fileName, lineNo] = viteMatch;
    const cleanFileName = fileName.split("/").pop() || fileName;
    return `${cleanFileName}:${lineNo}`;
  }

  // 通常のNode.jsパターン: at functionName (filepath:line:column)
  const nodeMatch = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
  if (nodeMatch) {
    const [, funcName, filePath, lineNo] = nodeMatch;
    const fileName = filePath.split("/").pop() || filePath;
    return `${fileName}:${lineNo}:${funcName}`;
  }

  // 別のパターン: at filepath:line:column
  const simpleMatch = callerLine.match(/at\s+(.+?):(\d+):(\d+)/);
  if (simpleMatch) {
    const [, filePath, lineNo] = simpleMatch;
    const fileName = filePath.split("/").pop() || filePath;
    return `${fileName}:${lineNo}`;
  }

  return "unknown";
};

// Node.js環境でのログ出力
const logWithLevelNode = (level: DebugLevel, ...data: any[]) => {
  const currentTimestamp = Date.now();
  const elapsedTime = lastLogTimestamp
    ? currentTimestamp - lastLogTimestamp
    : 0;
  const timestamp = new Date().toISOString();
  const callerInfo = getCallerInfo();

  const color = ANSI_COLORS[level];
  const grayColor = "\x1b[90m";

  // システム情報部分
  const systemInfo = `${grayColor}[${timestamp}] [${callerInfo}] ${
    elapsedTime > 0 ? `(+${elapsedTime}ms)` : ""
  }${ANSI_RESET}`;

  // レベルとメッセージ部分
  const levelPrefix = `${color}[${level}]${ANSI_RESET}`;

  // 出力フォーマット: [レベル] システム情報 | メッセージ
  const logMessage = [levelPrefix, systemInfo, "|", ...data];

  if (level === "ERROR") {
    console.error(...logMessage);
  } else {
    console.log(...logMessage);
  }

  lastLogTimestamp = currentTimestamp;
};

// ブラウザ環境でのログ出力
const logWithLevelBrowser = (level: DebugLevel, ...data: any[]) => {
  const currentTimestamp = Date.now();
  const elapsedTime = lastLogTimestamp
    ? currentTimestamp - lastLogTimestamp
    : 0;
  const timestamp = new Date().toISOString();
  const callerInfo = getCallerInfo();

  const levelStyle = CSS_STYLES[level];

  // システム情報とメッセージを組み合わせ
  const systemInfo = `[${timestamp}] [${callerInfo}] ${
    elapsedTime > 0 ? `(+${elapsedTime}ms)` : ""
  }`;

  if (level === "ERROR") {
    console.error(
      `%c[${level}]%c ${systemInfo} | %o`,
      levelStyle,
      GRAY_STYLE,
      ...data
    );
    console.error("スタックトレース:", new Error().stack);
  } else {
    console.log(
      `%c[${level}]%c ${systemInfo} |`,
      levelStyle,
      GRAY_STYLE,
      ...data
    );
  }

  lastLogTimestamp = currentTimestamp;
};

// ログを出力する共通関数
const logWithLevel = (level: DebugLevel, ...data: any[]) => {
  if (!settings.debug.enabled) return;

  // 現在設定されているレベルより低い優先度の場合は出力しない
  if (LOG_LEVELS[level] > LOG_LEVELS[settings.debug.level]) return;

  if (isBrowser) {
    logWithLevelBrowser(level, ...data);
  } else {
    logWithLevelNode(level, ...data);
  }
};

// 各レベルのログ関数
export const debugError = (...data: any[]) => logWithLevel("ERROR", ...data);
export const debugWarn = (...data: any[]) => logWithLevel("WARN", ...data);
export const debugInfo = (...data: any[]) => logWithLevel("INFO", ...data);
export const debugDebug = (...data: any[]) => logWithLevel("DEBUG", ...data);
export const debugTrace = (...data: any[]) => logWithLevel("TRACE", ...data);

// 後方互換性のためのデフォルト関数（DEBUGレベルとして扱う）
export const debug = debugDebug;
