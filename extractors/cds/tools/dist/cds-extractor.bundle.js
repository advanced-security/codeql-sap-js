#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// cds-extractor.ts
var import_path14 = require("path");

// node_modules/@isaacs/balanced-match/dist/esm/index.js
var balanced = (a, b, str) => {
  const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
  const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
  const r = ma !== null && mb != null && range(ma, mb, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + ma.length, r[1]),
    post: str.slice(r[1] + mb.length)
  };
};
var maybeMatch = (reg, str) => {
  const m = str.match(reg);
  return m ? m[0] : null;
};
var range = (a, b, str) => {
  let begs, beg, left, right = void 0, result;
  let ai = str.indexOf(a);
  let bi = str.indexOf(b, ai + 1);
  let i = ai;
  if (ai >= 0 && bi > 0) {
    if (a === b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i >= 0 && !result) {
      if (i === ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length === 1) {
        const r = begs.pop();
        if (r !== void 0)
          result = [r, bi];
      } else {
        beg = begs.pop();
        if (beg !== void 0 && beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b, i + 1);
      }
      i = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length && right !== void 0) {
      result = [left, right];
    }
  }
  return result;
};

// node_modules/@isaacs/brace-expansion/dist/esm/index.js
var escSlash = "\0SLASH" + Math.random() + "\0";
var escOpen = "\0OPEN" + Math.random() + "\0";
var escClose = "\0CLOSE" + Math.random() + "\0";
var escComma = "\0COMMA" + Math.random() + "\0";
var escPeriod = "\0PERIOD" + Math.random() + "\0";
var escSlashPattern = new RegExp(escSlash, "g");
var escOpenPattern = new RegExp(escOpen, "g");
var escClosePattern = new RegExp(escClose, "g");
var escCommaPattern = new RegExp(escComma, "g");
var escPeriodPattern = new RegExp(escPeriod, "g");
var slashPattern = /\\\\/g;
var openPattern = /\\{/g;
var closePattern = /\\}/g;
var commaPattern = /\\,/g;
var periodPattern = /\\./g;
function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
  return str.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function parseCommaParts(str) {
  if (!str) {
    return [""];
  }
  const parts = [];
  const m = balanced("{", "}", str);
  if (!m) {
    return str.split(",");
  }
  const { pre, body, post } = m;
  const p = pre.split(",");
  p[p.length - 1] += "{" + body + "}";
  const postParts = parseCommaParts(post);
  if (post.length) {
    ;
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }
  parts.push.apply(parts, p);
  return parts;
}
function expand(str) {
  if (!str) {
    return [];
  }
  if (str.slice(0, 2) === "{}") {
    str = "\\{\\}" + str.slice(2);
  }
  return expand_(escapeBraces(str), true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}
function expand_(str, isTop) {
  const expansions = [];
  const m = balanced("{", "}", str);
  if (!m)
    return [str];
  const pre = m.pre;
  const post = m.post.length ? expand_(m.post, false) : [""];
  if (/\$$/.test(m.pre)) {
    for (let k = 0; k < post.length; k++) {
      const expansion = pre + "{" + m.body + "}" + post[k];
      expansions.push(expansion);
    }
  } else {
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m.post.match(/,(?!,).*\}/)) {
        str = m.pre + "{" + m.body + escClose + m.post;
        return expand_(str);
      }
      return [str];
    }
    let n;
    if (isSequence) {
      n = m.body.split(/\.\./);
    } else {
      n = parseCommaParts(m.body);
      if (n.length === 1 && n[0] !== void 0) {
        n = expand_(n[0], false).map(embrace);
        if (n.length === 1) {
          return post.map((p) => m.pre + n[0] + p);
        }
      }
    }
    let N;
    if (isSequence && n[0] !== void 0 && n[1] !== void 0) {
      const x = numeric(n[0]);
      const y = numeric(n[1]);
      const width = Math.max(n[0].length, n[1].length);
      let incr = n.length === 3 && n[2] !== void 0 ? Math.abs(numeric(n[2])) : 1;
      let test = lte;
      const reverse = y < x;
      if (reverse) {
        incr *= -1;
        test = gte;
      }
      const pad = n.some(isPadded);
      N = [];
      for (let i = x; test(i, y); i += incr) {
        let c;
        if (isAlphaSequence) {
          c = String.fromCharCode(i);
          if (c === "\\") {
            c = "";
          }
        } else {
          c = String(i);
          if (pad) {
            const need = width - c.length;
            if (need > 0) {
              const z = new Array(need + 1).join("0");
              if (i < 0) {
                c = "-" + z + c.slice(1);
              } else {
                c = z + c;
              }
            }
          }
        }
        N.push(c);
      }
    } else {
      N = [];
      for (let j = 0; j < n.length; j++) {
        N.push.apply(N, expand_(n[j], false));
      }
    }
    for (let j = 0; j < N.length; j++) {
      for (let k = 0; k < post.length; k++) {
        const expansion = pre + N[j] + post[k];
        if (!isTop || isSequence || expansion) {
          expansions.push(expansion);
        }
      }
    }
  }
  return expansions;
}

// node_modules/glob/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/glob/node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x00-\\x7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob2, position) => {
  const pos = position;
  if (glob2.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE: while (i < glob2.length) {
    const c = glob2.charAt(i);
    if ((c === "!" || c === "^") && i === pos + 1) {
      negate = true;
      i++;
      continue;
    }
    if (c === "]" && sawStart && !escaping) {
      endPos = i + 1;
      break;
    }
    sawStart = true;
    if (c === "\\") {
      if (!escaping) {
        escaping = true;
        i++;
        continue;
      }
    }
    if (c === "[" && !escaping) {
      for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
        if (glob2.startsWith(cls, i)) {
          if (rangeStart) {
            return ["$.", false, glob2.length - pos, true];
          }
          i += cls.length;
          if (neg)
            negs.push(unip);
          else
            ranges.push(unip);
          uflag = uflag || u;
          continue WHILE;
        }
      }
    }
    escaping = false;
    if (rangeStart) {
      if (c > rangeStart) {
        ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
      } else if (c === rangeStart) {
        ranges.push(braceEscape(c));
      }
      rangeStart = "";
      i++;
      continue;
    }
    if (glob2.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-"));
      i += 2;
      continue;
    }
    if (glob2.startsWith("-", i + 1)) {
      rangeStart = c;
      i += 2;
      continue;
    }
    ranges.push(braceEscape(c));
    i++;
  }
  if (endPos < i) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob2.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// node_modules/glob/node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
  }
  return windowsPathsNoEscape ? s.replace(/\[([^\/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\{}])\]/g, "$1$2").replace(/\\([^\/{}])/g, "$1");
};

// node_modules/glob/node_modules/minimatch/dist/esm/ast.js
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var AST = class _AST {
  type;
  #root;
  #hasMagic;
  #uflag = false;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = false;
  #options;
  #toString;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #emptyExt = false;
  constructor(type, parent, options = {}) {
    this.type = type;
    if (type)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type === "!" && !this.#root.#filledNegs)
      this.#negs.push(this);
    this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== void 0)
      return this.#hasMagic;
    for (const p of this.#parts) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return this.#hasMagic = true;
    }
    return this.#hasMagic;
  }
  // reconstructs the pattern
  toString() {
    if (this.#toString !== void 0)
      return this.#toString;
    if (!this.type) {
      return this.#toString = this.#parts.map((p) => String(p)).join("");
    } else {
      return this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
    }
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString();
    this.#filledNegs = true;
    let n;
    while (n = this.#negs.pop()) {
      if (n.type !== "!")
        continue;
      let p = n;
      let pp = p.#parent;
      while (pp) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
          for (const part of n.#parts) {
            if (typeof part === "string") {
              throw new Error("string part in extglob AST??");
            }
            part.copyIn(pp.#parts[i]);
          }
        }
        p = pp;
        pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof _AST && p.#parent === this)) {
        throw new Error("invalid part: " + p);
      }
      this.#parts.push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (this.#root === this)
      return true;
    if (!this.#parent?.isStart())
      return false;
    if (this.#parentIndex === 0)
      return true;
    const p = this.#parent;
    for (let i = 0; i < this.#parentIndex; i++) {
      const pp = p.#parts[i];
      if (!(pp instanceof _AST && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (this.#root === this)
      return true;
    if (this.#parent?.type === "!")
      return true;
    if (!this.#parent?.isEnd())
      return false;
    if (!this.type)
      return this.#parent?.isEnd();
    const pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c = new _AST(this.type, parent);
    for (const p of this.#parts) {
      c.copyIn(p);
    }
    return c;
  }
  static #parseAST(str, ast, pos, opt) {
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i2 = pos;
      let acc2 = "";
      while (i2 < str.length) {
        const c = str.charAt(i2++);
        if (escaping || c === "\\") {
          escaping = !escaping;
          acc2 += c;
          continue;
        }
        if (inBrace) {
          if (i2 === braceStart + 1) {
            if (c === "^" || c === "!") {
              braceNeg = true;
            }
          } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
            inBrace = false;
          }
          acc2 += c;
          continue;
        } else if (c === "[") {
          inBrace = true;
          braceStart = i2;
          braceNeg = false;
          acc2 += c;
          continue;
        }
        if (!opt.noext && isExtglobType(c) && str.charAt(i2) === "(") {
          ast.push(acc2);
          acc2 = "";
          const ext2 = new _AST(c, ast);
          i2 = _AST.#parseAST(str, ext2, i2, opt);
          ast.push(ext2);
          continue;
        }
        acc2 += c;
      }
      ast.push(acc2);
      return i2;
    }
    let i = pos + 1;
    let part = new _AST(null, ast);
    const parts = [];
    let acc = "";
    while (i < str.length) {
      const c = str.charAt(i++);
      if (escaping || c === "\\") {
        escaping = !escaping;
        acc += c;
        continue;
      }
      if (inBrace) {
        if (i === braceStart + 1) {
          if (c === "^" || c === "!") {
            braceNeg = true;
          }
        } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc += c;
        continue;
      } else if (c === "[") {
        inBrace = true;
        braceStart = i;
        braceNeg = false;
        acc += c;
        continue;
      }
      if (isExtglobType(c) && str.charAt(i) === "(") {
        part.push(acc);
        acc = "";
        const ext2 = new _AST(c, part);
        part.push(ext2);
        i = _AST.#parseAST(str, ext2, i, opt);
        continue;
      }
      if (c === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new _AST(null, ast);
        continue;
      }
      if (c === ")") {
        if (acc === "" && ast.#parts.length === 0) {
          ast.#emptyExt = true;
        }
        part.push(acc);
        acc = "";
        ast.push(...parts, part);
        return i;
      }
      acc += c;
    }
    ast.type = null;
    ast.#hasMagic = void 0;
    ast.#parts = [str.substring(pos - 1)];
    return i;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new _AST(null, void 0, options);
    _AST.#parseAST(pattern, ast, 0, options);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob2 = this.toString();
    const [re, body, hasMagic2, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic2 || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob2.toUpperCase() !== glob2.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob2
    });
  }
  get options() {
    return this.#options;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this)
      this.#fillNegs();
    if (!this.type) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s) => typeof s !== "string");
      const src = this.#parts.map((p) => {
        const [re, _, hasMagic2, uflag] = typeof p === "string" ? _AST.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic2;
        this.#uflag = this.#uflag || uflag;
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof this.#parts[0] === "string") {
          const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = (
              // dots are allowed, and the pattern starts with [ or .
              dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
              src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
              src.startsWith("\\.\\.") && aps.has(src.charAt(4))
            );
            const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src + end;
      return [
        final2,
        unescape(src),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s = this.toString();
      this.#parts = [s];
      this.type = null;
      this.#hasMagic = void 0;
      return [s, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && this.#emptyExt) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob2, hasMagic2, noEmpty = false) {
    let escaping = false;
    let re = "";
    let uflag = false;
    for (let i = 0; i < glob2.length; i++) {
      const c = glob2.charAt(i);
      if (escaping) {
        escaping = false;
        re += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "\\") {
        if (i === glob2.length - 1) {
          re += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c === "[") {
        const [src, needUflag, consumed, magic] = parseClass(glob2, i);
        if (consumed) {
          re += src;
          uflag = uflag || needUflag;
          i += consumed - 1;
          hasMagic2 = hasMagic2 || magic;
          continue;
        }
      }
      if (c === "*") {
        re += noEmpty && glob2 === "*" ? starNoEmpty : star;
        hasMagic2 = true;
        continue;
      }
      if (c === "?") {
        re += qmark;
        hasMagic2 = true;
        continue;
      }
      re += regExpEscape(c);
    }
    return [re, unescape(glob2), !!hasMagic2, uflag];
  }
};

// node_modules/glob/node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/glob/node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
var starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2);
var starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2);
var starDotExtTestNocase = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2);
};
var starDotExtTestNocaseDot = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => f.toLowerCase().endsWith(ext2);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f) => !f.startsWith(".") && f.includes(".");
var starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f) => f.length !== 0 && !f.startsWith(".");
var starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..";
var qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
var qmarksTestNocase = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTest = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && !f.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && f !== "." && f !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = /* @__PURE__ */ Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern);
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f) => mm.match(f));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._) {
  }
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [...s.slice(0, 4), ...s.slice(4).map((ss) => this.parse(ss))];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s) => s.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i = 0; i < this.set.length; i++) {
        const p = this.set[i];
        if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (let i = 0; i < globParts.length; i++) {
        for (let j = 0; j < globParts[i].length; j++) {
          if (globParts[i][j] === "**") {
            globParts[i][j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
        let i = gs;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs) {
          parts.splice(gs, i - gs);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          const p = parts[i];
          if (i === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i, 1);
            i--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**") {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (i === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i, 1);
              i--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++) {
      for (let j = i + 1; j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a.length && bi < b.length) {
      if (a[ai] === b[bi]) {
        result.push(which === "b" ? b[bi] : a[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
        result.push(a[ai]);
        ai++;
      } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
        result.push(b[bi]);
        bi++;
      } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai]);
        ai++;
        bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = false) {
    const options = this.options;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [file[fdi], pattern[pdi]];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          if (pdi > fdi) {
            pattern = pattern.slice(pdi);
          } else if (fdi > pdi) {
            file = file.slice(fdi);
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    this.debug("matchOne", this, { file, pattern });
    this.debug("matchOne", file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      var p = pattern[pi];
      var f = file[fi];
      this.debug(pattern, p, f);
      if (p === false) {
        return false;
      }
      if (p === GLOBSTAR) {
        this.debug("GLOBSTAR", [pattern, p, f]);
        var fr = fi;
        var pr = pi + 1;
        if (pr === pl) {
          this.debug("** at the end");
          for (; fi < fl; fi++) {
            if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
              return false;
          }
          return true;
        }
        while (fr < fl) {
          var swallowee = file[fr];
          this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
          if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
            this.debug("globstar found match!", fr, fl, swallowee);
            return true;
          } else {
            if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
              this.debug("dot detected!", file, fr, pattern, pr);
              break;
            }
            this.debug("globstar swallow a segment, and continue");
            fr++;
          }
        }
        if (partial) {
          this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
          if (fr === fl) {
            return true;
          }
        }
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f === p;
        this.debug("string match", p, f, hit);
      } else {
        hit = p.test(f);
        this.debug("pattern match", p, f, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m;
    let fastTest = null;
    if (m = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
    } else if (m = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
    } else if (m = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f of p.flags.split(""))
            flags.add(f);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i) => {
        const next = pp[i + 1];
        const prev = pp[i - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === void 0) {
          if (next !== void 0 && next !== GLOBSTAR) {
            pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i] = twoStar;
          }
        } else if (next === void 0) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i + 1] = GLOBSTAR;
        }
      });
      const filtered = pp.filter((p) => p !== GLOBSTAR);
      if (this.partial && filtered.length >= 1) {
        const prefixes = [];
        for (let i = 1; i <= filtered.length; i++) {
          prefixes.push(filtered.slice(0, i).join("/"));
        }
        return "(?:" + prefixes.join("|") + ")";
      }
      return filtered.join("/");
    }).join("|");
    const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$";
    if (this.partial) {
      re = "^(?:\\/|" + open + re.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch (ex) {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f, partial = this.partial) {
    this.debug("match", f, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f === "";
    }
    if (f === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f = f.split("\\").join("/");
    }
    const ff = this.slashSplit(f);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (let i = 0; i < set.length; i++) {
      const pattern = set[i];
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// node_modules/glob/dist/esm/glob.js
var import_node_url2 = require("node:url");

// node_modules/path-scurry/node_modules/lru-cache/dist/esm/index.js
var perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
var warned = /* @__PURE__ */ new Set();
var PROCESS = typeof process === "object" && !!process ? process : {};
var emitWarning = (msg, type, code, fn) => {
  typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
};
var AC = globalThis.AbortController;
var AS = globalThis.AbortSignal;
if (typeof AC === "undefined") {
  AS = class AbortSignal {
    onabort;
    _onabort = [];
    reason;
    aborted = false;
    addEventListener(_, fn) {
      this._onabort.push(fn);
    }
  };
  AC = class AbortController {
    constructor() {
      warnACPolyfill();
    }
    signal = new AS();
    abort(reason) {
      if (this.signal.aborted)
        return;
      this.signal.reason = reason;
      this.signal.aborted = true;
      for (const fn of this.signal._onabort) {
        fn(reason);
      }
      this.signal.onabort?.(reason);
    }
  };
  let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1";
  const warnACPolyfill = () => {
    if (!printACPolyfillWarning)
      return;
    printACPolyfillWarning = false;
    emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
  };
}
var shouldWarn = (code) => !warned.has(code);
var isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
var getUintArray = (max) => !isPosInt(max) ? null : max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
var ZeroArray = class extends Array {
  constructor(size) {
    super(size);
    this.fill(0);
  }
};
var Stack = class _Stack {
  heap;
  length;
  // private constructor
  static #constructing = false;
  static create(max) {
    const HeapCls = getUintArray(max);
    if (!HeapCls)
      return [];
    _Stack.#constructing = true;
    const s = new _Stack(max, HeapCls);
    _Stack.#constructing = false;
    return s;
  }
  constructor(max, HeapCls) {
    if (!_Stack.#constructing) {
      throw new TypeError("instantiate Stack using Stack.create(n)");
    }
    this.heap = new HeapCls(max);
    this.length = 0;
  }
  push(n) {
    this.heap[this.length++] = n;
  }
  pop() {
    return this.heap[--this.length];
  }
};
var LRUCache = class _LRUCache {
  // options that cannot be changed without disaster
  #max;
  #maxSize;
  #dispose;
  #onInsert;
  #disposeAfter;
  #fetchMethod;
  #memoMethod;
  /**
   * {@link LRUCache.OptionsBase.ttl}
   */
  ttl;
  /**
   * {@link LRUCache.OptionsBase.ttlResolution}
   */
  ttlResolution;
  /**
   * {@link LRUCache.OptionsBase.ttlAutopurge}
   */
  ttlAutopurge;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnGet}
   */
  updateAgeOnGet;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnHas}
   */
  updateAgeOnHas;
  /**
   * {@link LRUCache.OptionsBase.allowStale}
   */
  allowStale;
  /**
   * {@link LRUCache.OptionsBase.noDisposeOnSet}
   */
  noDisposeOnSet;
  /**
   * {@link LRUCache.OptionsBase.noUpdateTTL}
   */
  noUpdateTTL;
  /**
   * {@link LRUCache.OptionsBase.maxEntrySize}
   */
  maxEntrySize;
  /**
   * {@link LRUCache.OptionsBase.sizeCalculation}
   */
  sizeCalculation;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
   */
  noDeleteOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
   */
  noDeleteOnStaleGet;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
   */
  allowStaleOnFetchAbort;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
   */
  allowStaleOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.ignoreFetchAbort}
   */
  ignoreFetchAbort;
  // computed properties
  #size;
  #calculatedSize;
  #keyMap;
  #keyList;
  #valList;
  #next;
  #prev;
  #head;
  #tail;
  #free;
  #disposed;
  #sizes;
  #starts;
  #ttls;
  #hasDispose;
  #hasFetchMethod;
  #hasDisposeAfter;
  #hasOnInsert;
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(c) {
    return {
      // properties
      starts: c.#starts,
      ttls: c.#ttls,
      sizes: c.#sizes,
      keyMap: c.#keyMap,
      keyList: c.#keyList,
      valList: c.#valList,
      next: c.#next,
      prev: c.#prev,
      get head() {
        return c.#head;
      },
      get tail() {
        return c.#tail;
      },
      free: c.#free,
      // methods
      isBackgroundFetch: (p) => c.#isBackgroundFetch(p),
      backgroundFetch: (k, index, options, context) => c.#backgroundFetch(k, index, options, context),
      moveToTail: (index) => c.#moveToTail(index),
      indexes: (options) => c.#indexes(options),
      rindexes: (options) => c.#rindexes(options),
      isStale: (index) => c.#isStale(index)
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return this.#max;
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return this.#maxSize;
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return this.#calculatedSize;
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return this.#size;
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return this.#fetchMethod;
  }
  get memoMethod() {
    return this.#memoMethod;
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return this.#dispose;
  }
  /**
   * {@link LRUCache.OptionsBase.onInsert} (read-only)
   */
  get onInsert() {
    return this.#onInsert;
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return this.#disposeAfter;
  }
  constructor(options) {
    const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, onInsert, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, memoMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
    if (max !== 0 && !isPosInt(max)) {
      throw new TypeError("max option must be a nonnegative integer");
    }
    const UintArray = max ? getUintArray(max) : Array;
    if (!UintArray) {
      throw new Error("invalid max value: " + max);
    }
    this.#max = max;
    this.#maxSize = maxSize;
    this.maxEntrySize = maxEntrySize || this.#maxSize;
    this.sizeCalculation = sizeCalculation;
    if (this.sizeCalculation) {
      if (!this.#maxSize && !this.maxEntrySize) {
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      }
      if (typeof this.sizeCalculation !== "function") {
        throw new TypeError("sizeCalculation set to non-function");
      }
    }
    if (memoMethod !== void 0 && typeof memoMethod !== "function") {
      throw new TypeError("memoMethod must be a function if defined");
    }
    this.#memoMethod = memoMethod;
    if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
      throw new TypeError("fetchMethod must be a function if specified");
    }
    this.#fetchMethod = fetchMethod;
    this.#hasFetchMethod = !!fetchMethod;
    this.#keyMap = /* @__PURE__ */ new Map();
    this.#keyList = new Array(max).fill(void 0);
    this.#valList = new Array(max).fill(void 0);
    this.#next = new UintArray(max);
    this.#prev = new UintArray(max);
    this.#head = 0;
    this.#tail = 0;
    this.#free = Stack.create(max);
    this.#size = 0;
    this.#calculatedSize = 0;
    if (typeof dispose === "function") {
      this.#dispose = dispose;
    }
    if (typeof onInsert === "function") {
      this.#onInsert = onInsert;
    }
    if (typeof disposeAfter === "function") {
      this.#disposeAfter = disposeAfter;
      this.#disposed = [];
    } else {
      this.#disposeAfter = void 0;
      this.#disposed = void 0;
    }
    this.#hasDispose = !!this.#dispose;
    this.#hasOnInsert = !!this.#onInsert;
    this.#hasDisposeAfter = !!this.#disposeAfter;
    this.noDisposeOnSet = !!noDisposeOnSet;
    this.noUpdateTTL = !!noUpdateTTL;
    this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
    this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
    this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
    this.ignoreFetchAbort = !!ignoreFetchAbort;
    if (this.maxEntrySize !== 0) {
      if (this.#maxSize !== 0) {
        if (!isPosInt(this.#maxSize)) {
          throw new TypeError("maxSize must be a positive integer if specified");
        }
      }
      if (!isPosInt(this.maxEntrySize)) {
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      }
      this.#initializeSizeTracking();
    }
    this.allowStale = !!allowStale;
    this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
    this.updateAgeOnGet = !!updateAgeOnGet;
    this.updateAgeOnHas = !!updateAgeOnHas;
    this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
    this.ttlAutopurge = !!ttlAutopurge;
    this.ttl = ttl || 0;
    if (this.ttl) {
      if (!isPosInt(this.ttl)) {
        throw new TypeError("ttl must be a positive integer if specified");
      }
      this.#initializeTTLTracking();
    }
    if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0) {
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    }
    if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
      const code = "LRU_CACHE_UNBOUNDED";
      if (shouldWarn(code)) {
        warned.add(code);
        const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
        emitWarning(msg, "UnboundedCacheWarning", code, _LRUCache);
      }
    }
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(key) {
    return this.#keyMap.has(key) ? Infinity : 0;
  }
  #initializeTTLTracking() {
    const ttls = new ZeroArray(this.#max);
    const starts = new ZeroArray(this.#max);
    this.#ttls = ttls;
    this.#starts = starts;
    this.#setItemTTL = (index, ttl, start = perf.now()) => {
      starts[index] = ttl !== 0 ? start : 0;
      ttls[index] = ttl;
      if (ttl !== 0 && this.ttlAutopurge) {
        const t = setTimeout(() => {
          if (this.#isStale(index)) {
            this.#delete(this.#keyList[index], "expire");
          }
        }, ttl + 1);
        if (t.unref) {
          t.unref();
        }
      }
    };
    this.#updateItemAge = (index) => {
      starts[index] = ttls[index] !== 0 ? perf.now() : 0;
    };
    this.#statusTTL = (status, index) => {
      if (ttls[index]) {
        const ttl = ttls[index];
        const start = starts[index];
        if (!ttl || !start)
          return;
        status.ttl = ttl;
        status.start = start;
        status.now = cachedNow || getNow();
        const age = status.now - start;
        status.remainingTTL = ttl - age;
      }
    };
    let cachedNow = 0;
    const getNow = () => {
      const n = perf.now();
      if (this.ttlResolution > 0) {
        cachedNow = n;
        const t = setTimeout(() => cachedNow = 0, this.ttlResolution);
        if (t.unref) {
          t.unref();
        }
      }
      return n;
    };
    this.getRemainingTTL = (key) => {
      const index = this.#keyMap.get(key);
      if (index === void 0) {
        return 0;
      }
      const ttl = ttls[index];
      const start = starts[index];
      if (!ttl || !start) {
        return Infinity;
      }
      const age = (cachedNow || getNow()) - start;
      return ttl - age;
    };
    this.#isStale = (index) => {
      const s = starts[index];
      const t = ttls[index];
      return !!t && !!s && (cachedNow || getNow()) - s > t;
    };
  }
  // conditionally set private methods related to TTL
  #updateItemAge = () => {
  };
  #statusTTL = () => {
  };
  #setItemTTL = () => {
  };
  /* c8 ignore stop */
  #isStale = () => false;
  #initializeSizeTracking() {
    const sizes = new ZeroArray(this.#max);
    this.#calculatedSize = 0;
    this.#sizes = sizes;
    this.#removeItemSize = (index) => {
      this.#calculatedSize -= sizes[index];
      sizes[index] = 0;
    };
    this.#requireSize = (k, v, size, sizeCalculation) => {
      if (this.#isBackgroundFetch(v)) {
        return 0;
      }
      if (!isPosInt(size)) {
        if (sizeCalculation) {
          if (typeof sizeCalculation !== "function") {
            throw new TypeError("sizeCalculation must be a function");
          }
          size = sizeCalculation(v, k);
          if (!isPosInt(size)) {
            throw new TypeError("sizeCalculation return invalid (expect positive integer)");
          }
        } else {
          throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
        }
      }
      return size;
    };
    this.#addItemSize = (index, size, status) => {
      sizes[index] = size;
      if (this.#maxSize) {
        const maxSize = this.#maxSize - sizes[index];
        while (this.#calculatedSize > maxSize) {
          this.#evict(true);
        }
      }
      this.#calculatedSize += sizes[index];
      if (status) {
        status.entrySize = size;
        status.totalCalculatedSize = this.#calculatedSize;
      }
    };
  }
  #removeItemSize = (_i) => {
  };
  #addItemSize = (_i, _s, _st) => {
  };
  #requireSize = (_k, _v, size, sizeCalculation) => {
    if (size || sizeCalculation) {
      throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
    }
    return 0;
  };
  *#indexes({ allowStale = this.allowStale } = {}) {
    if (this.#size) {
      for (let i = this.#tail; true; ) {
        if (!this.#isValidIndex(i)) {
          break;
        }
        if (allowStale || !this.#isStale(i)) {
          yield i;
        }
        if (i === this.#head) {
          break;
        } else {
          i = this.#prev[i];
        }
      }
    }
  }
  *#rindexes({ allowStale = this.allowStale } = {}) {
    if (this.#size) {
      for (let i = this.#head; true; ) {
        if (!this.#isValidIndex(i)) {
          break;
        }
        if (allowStale || !this.#isStale(i)) {
          yield i;
        }
        if (i === this.#tail) {
          break;
        } else {
          i = this.#next[i];
        }
      }
    }
  }
  #isValidIndex(index) {
    return index !== void 0 && this.#keyMap.get(this.#keyList[index]) === index;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (const i of this.#indexes()) {
      if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield [this.#keyList[i], this.#valList[i]];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (const i of this.#rindexes()) {
      if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield [this.#keyList[i], this.#valList[i]];
      }
    }
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (const i of this.#indexes()) {
      const k = this.#keyList[i];
      if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield k;
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (const i of this.#rindexes()) {
      const k = this.#keyList[i];
      if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield k;
      }
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (const i of this.#indexes()) {
      const v = this.#valList[i];
      if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield this.#valList[i];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (const i of this.#rindexes()) {
      const v = this.#valList[i];
      if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
        yield this.#valList[i];
      }
    }
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * A String value that is used in the creation of the default string
   * description of an object. Called by the built-in method
   * `Object.prototype.toString`.
   */
  [Symbol.toStringTag] = "LRUCache";
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(fn, getOptions = {}) {
    for (const i of this.#indexes()) {
      const v = this.#valList[i];
      const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      if (fn(value, this.#keyList[i], this)) {
        return this.get(this.#keyList[i], getOptions);
      }
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(fn, thisp = this) {
    for (const i of this.#indexes()) {
      const v = this.#valList[i];
      const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, this.#keyList[i], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(fn, thisp = this) {
    for (const i of this.#rindexes()) {
      const v = this.#valList[i];
      const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, this.#keyList[i], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let deleted = false;
    for (const i of this.#rindexes({ allowStale: true })) {
      if (this.#isStale(i)) {
        this.#delete(this.#keyList[i], "expire");
        deleted = true;
      }
    }
    return deleted;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(key) {
    const i = this.#keyMap.get(key);
    if (i === void 0)
      return void 0;
    const v = this.#valList[i];
    const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
    if (value === void 0)
      return void 0;
    const entry = { value };
    if (this.#ttls && this.#starts) {
      const ttl = this.#ttls[i];
      const start = this.#starts[i];
      if (ttl && start) {
        const remain = ttl - (perf.now() - start);
        entry.ttl = remain;
        entry.start = Date.now();
      }
    }
    if (this.#sizes) {
      entry.size = this.#sizes[i];
    }
    return entry;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    const arr = [];
    for (const i of this.#indexes({ allowStale: true })) {
      const key = this.#keyList[i];
      const v = this.#valList[i];
      const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0 || key === void 0)
        continue;
      const entry = { value };
      if (this.#ttls && this.#starts) {
        entry.ttl = this.#ttls[i];
        const age = perf.now() - this.#starts[i];
        entry.start = Math.floor(Date.now() - age);
      }
      if (this.#sizes) {
        entry.size = this.#sizes[i];
      }
      arr.unshift([key, entry]);
    }
    return arr;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(arr) {
    this.clear();
    for (const [key, entry] of arr) {
      if (entry.start) {
        const age = Date.now() - entry.start;
        entry.start = perf.now() - age;
      }
      this.set(key, entry.value, entry);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(k, v, setOptions = {}) {
    if (v === void 0) {
      this.delete(k);
      return this;
    }
    const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
    let { noUpdateTTL = this.noUpdateTTL } = setOptions;
    const size = this.#requireSize(k, v, setOptions.size || 0, sizeCalculation);
    if (this.maxEntrySize && size > this.maxEntrySize) {
      if (status) {
        status.set = "miss";
        status.maxEntrySizeExceeded = true;
      }
      this.#delete(k, "set");
      return this;
    }
    let index = this.#size === 0 ? void 0 : this.#keyMap.get(k);
    if (index === void 0) {
      index = this.#size === 0 ? this.#tail : this.#free.length !== 0 ? this.#free.pop() : this.#size === this.#max ? this.#evict(false) : this.#size;
      this.#keyList[index] = k;
      this.#valList[index] = v;
      this.#keyMap.set(k, index);
      this.#next[this.#tail] = index;
      this.#prev[index] = this.#tail;
      this.#tail = index;
      this.#size++;
      this.#addItemSize(index, size, status);
      if (status)
        status.set = "add";
      noUpdateTTL = false;
      if (this.#hasOnInsert) {
        this.#onInsert?.(v, k, "add");
      }
    } else {
      this.#moveToTail(index);
      const oldVal = this.#valList[index];
      if (v !== oldVal) {
        if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
          oldVal.__abortController.abort(new Error("replaced"));
          const { __staleWhileFetching: s } = oldVal;
          if (s !== void 0 && !noDisposeOnSet) {
            if (this.#hasDispose) {
              this.#dispose?.(s, k, "set");
            }
            if (this.#hasDisposeAfter) {
              this.#disposed?.push([s, k, "set"]);
            }
          }
        } else if (!noDisposeOnSet) {
          if (this.#hasDispose) {
            this.#dispose?.(oldVal, k, "set");
          }
          if (this.#hasDisposeAfter) {
            this.#disposed?.push([oldVal, k, "set"]);
          }
        }
        this.#removeItemSize(index);
        this.#addItemSize(index, size, status);
        this.#valList[index] = v;
        if (status) {
          status.set = "replace";
          const oldValue = oldVal && this.#isBackgroundFetch(oldVal) ? oldVal.__staleWhileFetching : oldVal;
          if (oldValue !== void 0)
            status.oldValue = oldValue;
        }
      } else if (status) {
        status.set = "update";
      }
      if (this.#hasOnInsert) {
        this.onInsert?.(v, k, v === oldVal ? "update" : "replace");
      }
    }
    if (ttl !== 0 && !this.#ttls) {
      this.#initializeTTLTracking();
    }
    if (this.#ttls) {
      if (!noUpdateTTL) {
        this.#setItemTTL(index, ttl, start);
      }
      if (status)
        this.#statusTTL(status, index);
    }
    if (!noDisposeOnSet && this.#hasDisposeAfter && this.#disposed) {
      const dt = this.#disposed;
      let task;
      while (task = dt?.shift()) {
        this.#disposeAfter?.(...task);
      }
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    try {
      while (this.#size) {
        const val = this.#valList[this.#head];
        this.#evict(true);
        if (this.#isBackgroundFetch(val)) {
          if (val.__staleWhileFetching) {
            return val.__staleWhileFetching;
          }
        } else if (val !== void 0) {
          return val;
        }
      }
    } finally {
      if (this.#hasDisposeAfter && this.#disposed) {
        const dt = this.#disposed;
        let task;
        while (task = dt?.shift()) {
          this.#disposeAfter?.(...task);
        }
      }
    }
  }
  #evict(free) {
    const head = this.#head;
    const k = this.#keyList[head];
    const v = this.#valList[head];
    if (this.#hasFetchMethod && this.#isBackgroundFetch(v)) {
      v.__abortController.abort(new Error("evicted"));
    } else if (this.#hasDispose || this.#hasDisposeAfter) {
      if (this.#hasDispose) {
        this.#dispose?.(v, k, "evict");
      }
      if (this.#hasDisposeAfter) {
        this.#disposed?.push([v, k, "evict"]);
      }
    }
    this.#removeItemSize(head);
    if (free) {
      this.#keyList[head] = void 0;
      this.#valList[head] = void 0;
      this.#free.push(head);
    }
    if (this.#size === 1) {
      this.#head = this.#tail = 0;
      this.#free.length = 0;
    } else {
      this.#head = this.#next[head];
    }
    this.#keyMap.delete(k);
    this.#size--;
    return head;
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(k, hasOptions = {}) {
    const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
    const index = this.#keyMap.get(k);
    if (index !== void 0) {
      const v = this.#valList[index];
      if (this.#isBackgroundFetch(v) && v.__staleWhileFetching === void 0) {
        return false;
      }
      if (!this.#isStale(index)) {
        if (updateAgeOnHas) {
          this.#updateItemAge(index);
        }
        if (status) {
          status.has = "hit";
          this.#statusTTL(status, index);
        }
        return true;
      } else if (status) {
        status.has = "stale";
        this.#statusTTL(status, index);
      }
    } else if (status) {
      status.has = "miss";
    }
    return false;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(k, peekOptions = {}) {
    const { allowStale = this.allowStale } = peekOptions;
    const index = this.#keyMap.get(k);
    if (index === void 0 || !allowStale && this.#isStale(index)) {
      return;
    }
    const v = this.#valList[index];
    return this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
  }
  #backgroundFetch(k, index, options, context) {
    const v = index === void 0 ? void 0 : this.#valList[index];
    if (this.#isBackgroundFetch(v)) {
      return v;
    }
    const ac = new AC();
    const { signal } = options;
    signal?.addEventListener("abort", () => ac.abort(signal.reason), {
      signal: ac.signal
    });
    const fetchOpts = {
      signal: ac.signal,
      options,
      context
    };
    const cb = (v2, updateCache = false) => {
      const { aborted } = ac.signal;
      const ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
      if (options.status) {
        if (aborted && !updateCache) {
          options.status.fetchAborted = true;
          options.status.fetchError = ac.signal.reason;
          if (ignoreAbort)
            options.status.fetchAbortIgnored = true;
        } else {
          options.status.fetchResolved = true;
        }
      }
      if (aborted && !ignoreAbort && !updateCache) {
        return fetchFail(ac.signal.reason);
      }
      const bf2 = p;
      if (this.#valList[index] === p) {
        if (v2 === void 0) {
          if (bf2.__staleWhileFetching) {
            this.#valList[index] = bf2.__staleWhileFetching;
          } else {
            this.#delete(k, "fetch");
          }
        } else {
          if (options.status)
            options.status.fetchUpdated = true;
          this.set(k, v2, fetchOpts.options);
        }
      }
      return v2;
    };
    const eb = (er) => {
      if (options.status) {
        options.status.fetchRejected = true;
        options.status.fetchError = er;
      }
      return fetchFail(er);
    };
    const fetchFail = (er) => {
      const { aborted } = ac.signal;
      const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
      const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
      const noDelete = allowStale || options.noDeleteOnFetchRejection;
      const bf2 = p;
      if (this.#valList[index] === p) {
        const del = !noDelete || bf2.__staleWhileFetching === void 0;
        if (del) {
          this.#delete(k, "fetch");
        } else if (!allowStaleAborted) {
          this.#valList[index] = bf2.__staleWhileFetching;
        }
      }
      if (allowStale) {
        if (options.status && bf2.__staleWhileFetching !== void 0) {
          options.status.returnedStale = true;
        }
        return bf2.__staleWhileFetching;
      } else if (bf2.__returned === bf2) {
        throw er;
      }
    };
    const pcall = (res, rej) => {
      const fmp = this.#fetchMethod?.(k, v, fetchOpts);
      if (fmp && fmp instanceof Promise) {
        fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej);
      }
      ac.signal.addEventListener("abort", () => {
        if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
          res(void 0);
          if (options.allowStaleOnFetchAbort) {
            res = (v2) => cb(v2, true);
          }
        }
      });
    };
    if (options.status)
      options.status.fetchDispatched = true;
    const p = new Promise(pcall).then(cb, eb);
    const bf = Object.assign(p, {
      __abortController: ac,
      __staleWhileFetching: v,
      __returned: void 0
    });
    if (index === void 0) {
      this.set(k, bf, { ...fetchOpts.options, status: void 0 });
      index = this.#keyMap.get(k);
    } else {
      this.#valList[index] = bf;
    }
    return bf;
  }
  #isBackgroundFetch(p) {
    if (!this.#hasFetchMethod)
      return false;
    const b = p;
    return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
  }
  async fetch(k, fetchOptions = {}) {
    const {
      // get options
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      // set options
      ttl = this.ttl,
      noDisposeOnSet = this.noDisposeOnSet,
      size = 0,
      sizeCalculation = this.sizeCalculation,
      noUpdateTTL = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
      ignoreFetchAbort = this.ignoreFetchAbort,
      allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
      context,
      forceRefresh = false,
      status,
      signal
    } = fetchOptions;
    if (!this.#hasFetchMethod) {
      if (status)
        status.fetch = "get";
      return this.get(k, {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        status
      });
    }
    const options = {
      allowStale,
      updateAgeOnGet,
      noDeleteOnStaleGet,
      ttl,
      noDisposeOnSet,
      size,
      sizeCalculation,
      noUpdateTTL,
      noDeleteOnFetchRejection,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
      status,
      signal
    };
    let index = this.#keyMap.get(k);
    if (index === void 0) {
      if (status)
        status.fetch = "miss";
      const p = this.#backgroundFetch(k, index, options, context);
      return p.__returned = p;
    } else {
      const v = this.#valList[index];
      if (this.#isBackgroundFetch(v)) {
        const stale = allowStale && v.__staleWhileFetching !== void 0;
        if (status) {
          status.fetch = "inflight";
          if (stale)
            status.returnedStale = true;
        }
        return stale ? v.__staleWhileFetching : v.__returned = v;
      }
      const isStale = this.#isStale(index);
      if (!forceRefresh && !isStale) {
        if (status)
          status.fetch = "hit";
        this.#moveToTail(index);
        if (updateAgeOnGet) {
          this.#updateItemAge(index);
        }
        if (status)
          this.#statusTTL(status, index);
        return v;
      }
      const p = this.#backgroundFetch(k, index, options, context);
      const hasStale = p.__staleWhileFetching !== void 0;
      const staleVal = hasStale && allowStale;
      if (status) {
        status.fetch = isStale ? "stale" : "refresh";
        if (staleVal && isStale)
          status.returnedStale = true;
      }
      return staleVal ? p.__staleWhileFetching : p.__returned = p;
    }
  }
  async forceFetch(k, fetchOptions = {}) {
    const v = await this.fetch(k, fetchOptions);
    if (v === void 0)
      throw new Error("fetch() returned undefined");
    return v;
  }
  memo(k, memoOptions = {}) {
    const memoMethod = this.#memoMethod;
    if (!memoMethod) {
      throw new Error("no memoMethod provided to constructor");
    }
    const { context, forceRefresh, ...options } = memoOptions;
    const v = this.get(k, options);
    if (!forceRefresh && v !== void 0)
      return v;
    const vv = memoMethod(k, v, {
      options,
      context
    });
    this.set(k, vv, options);
    return vv;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(k, getOptions = {}) {
    const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
    const index = this.#keyMap.get(k);
    if (index !== void 0) {
      const value = this.#valList[index];
      const fetching = this.#isBackgroundFetch(value);
      if (status)
        this.#statusTTL(status, index);
      if (this.#isStale(index)) {
        if (status)
          status.get = "stale";
        if (!fetching) {
          if (!noDeleteOnStaleGet) {
            this.#delete(k, "expire");
          }
          if (status && allowStale)
            status.returnedStale = true;
          return allowStale ? value : void 0;
        } else {
          if (status && allowStale && value.__staleWhileFetching !== void 0) {
            status.returnedStale = true;
          }
          return allowStale ? value.__staleWhileFetching : void 0;
        }
      } else {
        if (status)
          status.get = "hit";
        if (fetching) {
          return value.__staleWhileFetching;
        }
        this.#moveToTail(index);
        if (updateAgeOnGet) {
          this.#updateItemAge(index);
        }
        return value;
      }
    } else if (status) {
      status.get = "miss";
    }
  }
  #connect(p, n) {
    this.#prev[n] = p;
    this.#next[p] = n;
  }
  #moveToTail(index) {
    if (index !== this.#tail) {
      if (index === this.#head) {
        this.#head = this.#next[index];
      } else {
        this.#connect(this.#prev[index], this.#next[index]);
      }
      this.#connect(this.#tail, index);
      this.#tail = index;
    }
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(k) {
    return this.#delete(k, "delete");
  }
  #delete(k, reason) {
    let deleted = false;
    if (this.#size !== 0) {
      const index = this.#keyMap.get(k);
      if (index !== void 0) {
        deleted = true;
        if (this.#size === 1) {
          this.#clear(reason);
        } else {
          this.#removeItemSize(index);
          const v = this.#valList[index];
          if (this.#isBackgroundFetch(v)) {
            v.__abortController.abort(new Error("deleted"));
          } else if (this.#hasDispose || this.#hasDisposeAfter) {
            if (this.#hasDispose) {
              this.#dispose?.(v, k, reason);
            }
            if (this.#hasDisposeAfter) {
              this.#disposed?.push([v, k, reason]);
            }
          }
          this.#keyMap.delete(k);
          this.#keyList[index] = void 0;
          this.#valList[index] = void 0;
          if (index === this.#tail) {
            this.#tail = this.#prev[index];
          } else if (index === this.#head) {
            this.#head = this.#next[index];
          } else {
            const pi = this.#prev[index];
            this.#next[pi] = this.#next[index];
            const ni = this.#next[index];
            this.#prev[ni] = this.#prev[index];
          }
          this.#size--;
          this.#free.push(index);
        }
      }
    }
    if (this.#hasDisposeAfter && this.#disposed?.length) {
      const dt = this.#disposed;
      let task;
      while (task = dt?.shift()) {
        this.#disposeAfter?.(...task);
      }
    }
    return deleted;
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return this.#clear("delete");
  }
  #clear(reason) {
    for (const index of this.#rindexes({ allowStale: true })) {
      const v = this.#valList[index];
      if (this.#isBackgroundFetch(v)) {
        v.__abortController.abort(new Error("deleted"));
      } else {
        const k = this.#keyList[index];
        if (this.#hasDispose) {
          this.#dispose?.(v, k, reason);
        }
        if (this.#hasDisposeAfter) {
          this.#disposed?.push([v, k, reason]);
        }
      }
    }
    this.#keyMap.clear();
    this.#valList.fill(void 0);
    this.#keyList.fill(void 0);
    if (this.#ttls && this.#starts) {
      this.#ttls.fill(0);
      this.#starts.fill(0);
    }
    if (this.#sizes) {
      this.#sizes.fill(0);
    }
    this.#head = 0;
    this.#tail = 0;
    this.#free.length = 0;
    this.#calculatedSize = 0;
    this.#size = 0;
    if (this.#hasDisposeAfter && this.#disposed) {
      const dt = this.#disposed;
      let task;
      while (task = dt?.shift()) {
        this.#disposeAfter?.(...task);
      }
    }
  }
};

// node_modules/path-scurry/dist/esm/index.js
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_fs = require("fs");
var actualFS = __toESM(require("node:fs"), 1);
var import_promises = require("node:fs/promises");

// node_modules/minipass/dist/esm/index.js
var import_node_events = require("node:events");
var import_node_stream = __toESM(require("node:stream"), 1);
var import_node_string_decoder = require("node:string_decoder");
var proc = typeof process === "object" && process ? process : {
  stdout: null,
  stderr: null
};
var isStream = (s) => !!s && typeof s === "object" && (s instanceof Minipass || s instanceof import_node_stream.default || isReadable(s) || isWritable(s));
var isReadable = (s) => !!s && typeof s === "object" && s instanceof import_node_events.EventEmitter && typeof s.pipe === "function" && // node core Writable streams have a pipe() method, but it throws
s.pipe !== import_node_stream.default.Writable.prototype.pipe;
var isWritable = (s) => !!s && typeof s === "object" && s instanceof import_node_events.EventEmitter && typeof s.write === "function" && typeof s.end === "function";
var EOF = /* @__PURE__ */ Symbol("EOF");
var MAYBE_EMIT_END = /* @__PURE__ */ Symbol("maybeEmitEnd");
var EMITTED_END = /* @__PURE__ */ Symbol("emittedEnd");
var EMITTING_END = /* @__PURE__ */ Symbol("emittingEnd");
var EMITTED_ERROR = /* @__PURE__ */ Symbol("emittedError");
var CLOSED = /* @__PURE__ */ Symbol("closed");
var READ = /* @__PURE__ */ Symbol("read");
var FLUSH = /* @__PURE__ */ Symbol("flush");
var FLUSHCHUNK = /* @__PURE__ */ Symbol("flushChunk");
var ENCODING = /* @__PURE__ */ Symbol("encoding");
var DECODER = /* @__PURE__ */ Symbol("decoder");
var FLOWING = /* @__PURE__ */ Symbol("flowing");
var PAUSED = /* @__PURE__ */ Symbol("paused");
var RESUME = /* @__PURE__ */ Symbol("resume");
var BUFFER = /* @__PURE__ */ Symbol("buffer");
var PIPES = /* @__PURE__ */ Symbol("pipes");
var BUFFERLENGTH = /* @__PURE__ */ Symbol("bufferLength");
var BUFFERPUSH = /* @__PURE__ */ Symbol("bufferPush");
var BUFFERSHIFT = /* @__PURE__ */ Symbol("bufferShift");
var OBJECTMODE = /* @__PURE__ */ Symbol("objectMode");
var DESTROYED = /* @__PURE__ */ Symbol("destroyed");
var ERROR = /* @__PURE__ */ Symbol("error");
var EMITDATA = /* @__PURE__ */ Symbol("emitData");
var EMITEND = /* @__PURE__ */ Symbol("emitEnd");
var EMITEND2 = /* @__PURE__ */ Symbol("emitEnd2");
var ASYNC = /* @__PURE__ */ Symbol("async");
var ABORT = /* @__PURE__ */ Symbol("abort");
var ABORTED = /* @__PURE__ */ Symbol("aborted");
var SIGNAL = /* @__PURE__ */ Symbol("signal");
var DATALISTENERS = /* @__PURE__ */ Symbol("dataListeners");
var DISCARDED = /* @__PURE__ */ Symbol("discarded");
var defer = (fn) => Promise.resolve().then(fn);
var nodefer = (fn) => fn();
var isEndish = (ev) => ev === "end" || ev === "finish" || ev === "prefinish";
var isArrayBufferLike = (b) => b instanceof ArrayBuffer || !!b && typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
var isArrayBufferView = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
var Pipe = class {
  src;
  dest;
  opts;
  ondrain;
  constructor(src, dest, opts) {
    this.src = src;
    this.dest = dest;
    this.opts = opts;
    this.ondrain = () => src[RESUME]();
    this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // only here for the prototype
  /* c8 ignore start */
  proxyErrors(_er) {
  }
  /* c8 ignore stop */
  end() {
    this.unpipe();
    if (this.opts.end)
      this.dest.end();
  }
};
var PipeProxyErrors = class extends Pipe {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors);
    super.unpipe();
  }
  constructor(src, dest, opts) {
    super(src, dest, opts);
    this.proxyErrors = (er) => dest.emit("error", er);
    src.on("error", this.proxyErrors);
  }
};
var isObjectModeOptions = (o) => !!o.objectMode;
var isEncodingOptions = (o) => !o.objectMode && !!o.encoding && o.encoding !== "buffer";
var Minipass = class extends import_node_events.EventEmitter {
  [FLOWING] = false;
  [PAUSED] = false;
  [PIPES] = [];
  [BUFFER] = [];
  [OBJECTMODE];
  [ENCODING];
  [ASYNC];
  [DECODER];
  [EOF] = false;
  [EMITTED_END] = false;
  [EMITTING_END] = false;
  [CLOSED] = false;
  [EMITTED_ERROR] = null;
  [BUFFERLENGTH] = 0;
  [DESTROYED] = false;
  [SIGNAL];
  [ABORTED] = false;
  [DATALISTENERS] = 0;
  [DISCARDED] = false;
  /**
   * true if the stream can be written
   */
  writable = true;
  /**
   * true if the stream can be read
   */
  readable = true;
  /**
   * If `RType` is Buffer, then options do not need to be provided.
   * Otherwise, an options object must be provided to specify either
   * {@link Minipass.SharedOptions.objectMode} or
   * {@link Minipass.SharedOptions.encoding}, as appropriate.
   */
  constructor(...args) {
    const options = args[0] || {};
    super();
    if (options.objectMode && typeof options.encoding === "string") {
      throw new TypeError("Encoding and objectMode may not be used together");
    }
    if (isObjectModeOptions(options)) {
      this[OBJECTMODE] = true;
      this[ENCODING] = null;
    } else if (isEncodingOptions(options)) {
      this[ENCODING] = options.encoding;
      this[OBJECTMODE] = false;
    } else {
      this[OBJECTMODE] = false;
      this[ENCODING] = null;
    }
    this[ASYNC] = !!options.async;
    this[DECODER] = this[ENCODING] ? new import_node_string_decoder.StringDecoder(this[ENCODING]) : null;
    if (options && options.debugExposeBuffer === true) {
      Object.defineProperty(this, "buffer", { get: () => this[BUFFER] });
    }
    if (options && options.debugExposePipes === true) {
      Object.defineProperty(this, "pipes", { get: () => this[PIPES] });
    }
    const { signal } = options;
    if (signal) {
      this[SIGNAL] = signal;
      if (signal.aborted) {
        this[ABORT]();
      } else {
        signal.addEventListener("abort", () => this[ABORT]());
      }
    }
  }
  /**
   * The amount of data stored in the buffer waiting to be read.
   *
   * For Buffer strings, this will be the total byte length.
   * For string encoding streams, this will be the string character length,
   * according to JavaScript's `string.length` logic.
   * For objectMode streams, this is a count of the items waiting to be
   * emitted.
   */
  get bufferLength() {
    return this[BUFFERLENGTH];
  }
  /**
   * The `BufferEncoding` currently in use, or `null`
   */
  get encoding() {
    return this[ENCODING];
  }
  /**
   * @deprecated - This is a read only property
   */
  set encoding(_enc) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * @deprecated - Encoding may only be set at instantiation time
   */
  setEncoding(_enc) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * True if this is an objectMode stream
   */
  get objectMode() {
    return this[OBJECTMODE];
  }
  /**
   * @deprecated - This is a read-only property
   */
  set objectMode(_om) {
    throw new Error("objectMode must be set at instantiation time");
  }
  /**
   * true if this is an async stream
   */
  get ["async"]() {
    return this[ASYNC];
  }
  /**
   * Set to true to make this stream async.
   *
   * Once set, it cannot be unset, as this would potentially cause incorrect
   * behavior.  Ie, a sync stream can be made async, but an async stream
   * cannot be safely made sync.
   */
  set ["async"](a) {
    this[ASYNC] = this[ASYNC] || !!a;
  }
  // drop everything and get out of the flow completely
  [ABORT]() {
    this[ABORTED] = true;
    this.emit("abort", this[SIGNAL]?.reason);
    this.destroy(this[SIGNAL]?.reason);
  }
  /**
   * True if the stream has been aborted.
   */
  get aborted() {
    return this[ABORTED];
  }
  /**
   * No-op setter. Stream aborted status is set via the AbortSignal provided
   * in the constructor options.
   */
  set aborted(_) {
  }
  write(chunk, encoding, cb) {
    if (this[ABORTED])
      return false;
    if (this[EOF])
      throw new Error("write after end");
    if (this[DESTROYED]) {
      this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" }));
      return true;
    }
    if (typeof encoding === "function") {
      cb = encoding;
      encoding = "utf8";
    }
    if (!encoding)
      encoding = "utf8";
    const fn = this[ASYNC] ? defer : nodefer;
    if (!this[OBJECTMODE] && !Buffer.isBuffer(chunk)) {
      if (isArrayBufferView(chunk)) {
        chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      } else if (isArrayBufferLike(chunk)) {
        chunk = Buffer.from(chunk);
      } else if (typeof chunk !== "string") {
        throw new Error("Non-contiguous data written to non-objectMode stream");
      }
    }
    if (this[OBJECTMODE]) {
      if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
        this[FLUSH](true);
      if (this[FLOWING])
        this.emit("data", chunk);
      else
        this[BUFFERPUSH](chunk);
      if (this[BUFFERLENGTH] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this[FLOWING];
    }
    if (!chunk.length) {
      if (this[BUFFERLENGTH] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this[FLOWING];
    }
    if (typeof chunk === "string" && // unless it is a string already ready for us to use
    !(encoding === this[ENCODING] && !this[DECODER]?.lastNeed)) {
      chunk = Buffer.from(chunk, encoding);
    }
    if (Buffer.isBuffer(chunk) && this[ENCODING]) {
      chunk = this[DECODER].write(chunk);
    }
    if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
      this[FLUSH](true);
    if (this[FLOWING])
      this.emit("data", chunk);
    else
      this[BUFFERPUSH](chunk);
    if (this[BUFFERLENGTH] !== 0)
      this.emit("readable");
    if (cb)
      fn(cb);
    return this[FLOWING];
  }
  /**
   * Low-level explicit read method.
   *
   * In objectMode, the argument is ignored, and one item is returned if
   * available.
   *
   * `n` is the number of bytes (or in the case of encoding streams,
   * characters) to consume. If `n` is not provided, then the entire buffer
   * is returned, or `null` is returned if no data is available.
   *
   * If `n` is greater that the amount of data in the internal buffer,
   * then `null` is returned.
   */
  read(n) {
    if (this[DESTROYED])
      return null;
    this[DISCARDED] = false;
    if (this[BUFFERLENGTH] === 0 || n === 0 || n && n > this[BUFFERLENGTH]) {
      this[MAYBE_EMIT_END]();
      return null;
    }
    if (this[OBJECTMODE])
      n = null;
    if (this[BUFFER].length > 1 && !this[OBJECTMODE]) {
      this[BUFFER] = [
        this[ENCODING] ? this[BUFFER].join("") : Buffer.concat(this[BUFFER], this[BUFFERLENGTH])
      ];
    }
    const ret = this[READ](n || null, this[BUFFER][0]);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [READ](n, chunk) {
    if (this[OBJECTMODE])
      this[BUFFERSHIFT]();
    else {
      const c = chunk;
      if (n === c.length || n === null)
        this[BUFFERSHIFT]();
      else if (typeof c === "string") {
        this[BUFFER][0] = c.slice(n);
        chunk = c.slice(0, n);
        this[BUFFERLENGTH] -= n;
      } else {
        this[BUFFER][0] = c.subarray(n);
        chunk = c.subarray(0, n);
        this[BUFFERLENGTH] -= n;
      }
    }
    this.emit("data", chunk);
    if (!this[BUFFER].length && !this[EOF])
      this.emit("drain");
    return chunk;
  }
  end(chunk, encoding, cb) {
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = void 0;
    }
    if (typeof encoding === "function") {
      cb = encoding;
      encoding = "utf8";
    }
    if (chunk !== void 0)
      this.write(chunk, encoding);
    if (cb)
      this.once("end", cb);
    this[EOF] = true;
    this.writable = false;
    if (this[FLOWING] || !this[PAUSED])
      this[MAYBE_EMIT_END]();
    return this;
  }
  // don't let the internal resume be overwritten
  [RESUME]() {
    if (this[DESTROYED])
      return;
    if (!this[DATALISTENERS] && !this[PIPES].length) {
      this[DISCARDED] = true;
    }
    this[PAUSED] = false;
    this[FLOWING] = true;
    this.emit("resume");
    if (this[BUFFER].length)
      this[FLUSH]();
    else if (this[EOF])
      this[MAYBE_EMIT_END]();
    else
      this.emit("drain");
  }
  /**
   * Resume the stream if it is currently in a paused state
   *
   * If called when there are no pipe destinations or `data` event listeners,
   * this will place the stream in a "discarded" state, where all data will
   * be thrown away. The discarded state is removed if a pipe destination or
   * data handler is added, if pause() is called, or if any synchronous or
   * asynchronous iteration is started.
   */
  resume() {
    return this[RESUME]();
  }
  /**
   * Pause the stream
   */
  pause() {
    this[FLOWING] = false;
    this[PAUSED] = true;
    this[DISCARDED] = false;
  }
  /**
   * true if the stream has been forcibly destroyed
   */
  get destroyed() {
    return this[DESTROYED];
  }
  /**
   * true if the stream is currently in a flowing state, meaning that
   * any writes will be immediately emitted.
   */
  get flowing() {
    return this[FLOWING];
  }
  /**
   * true if the stream is currently in a paused state
   */
  get paused() {
    return this[PAUSED];
  }
  [BUFFERPUSH](chunk) {
    if (this[OBJECTMODE])
      this[BUFFERLENGTH] += 1;
    else
      this[BUFFERLENGTH] += chunk.length;
    this[BUFFER].push(chunk);
  }
  [BUFFERSHIFT]() {
    if (this[OBJECTMODE])
      this[BUFFERLENGTH] -= 1;
    else
      this[BUFFERLENGTH] -= this[BUFFER][0].length;
    return this[BUFFER].shift();
  }
  [FLUSH](noDrain = false) {
    do {
    } while (this[FLUSHCHUNK](this[BUFFERSHIFT]()) && this[BUFFER].length);
    if (!noDrain && !this[BUFFER].length && !this[EOF])
      this.emit("drain");
  }
  [FLUSHCHUNK](chunk) {
    this.emit("data", chunk);
    return this[FLOWING];
  }
  /**
   * Pipe all data emitted by this stream into the destination provided.
   *
   * Triggers the flow of data.
   */
  pipe(dest, opts) {
    if (this[DESTROYED])
      return dest;
    this[DISCARDED] = false;
    const ended = this[EMITTED_END];
    opts = opts || {};
    if (dest === proc.stdout || dest === proc.stderr)
      opts.end = false;
    else
      opts.end = opts.end !== false;
    opts.proxyErrors = !!opts.proxyErrors;
    if (ended) {
      if (opts.end)
        dest.end();
    } else {
      this[PIPES].push(!opts.proxyErrors ? new Pipe(this, dest, opts) : new PipeProxyErrors(this, dest, opts));
      if (this[ASYNC])
        defer(() => this[RESUME]());
      else
        this[RESUME]();
    }
    return dest;
  }
  /**
   * Fully unhook a piped destination stream.
   *
   * If the destination stream was the only consumer of this stream (ie,
   * there are no other piped destinations or `'data'` event listeners)
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  unpipe(dest) {
    const p = this[PIPES].find((p2) => p2.dest === dest);
    if (p) {
      if (this[PIPES].length === 1) {
        if (this[FLOWING] && this[DATALISTENERS] === 0) {
          this[FLOWING] = false;
        }
        this[PIPES] = [];
      } else
        this[PIPES].splice(this[PIPES].indexOf(p), 1);
      p.unpipe();
    }
  }
  /**
   * Alias for {@link Minipass#on}
   */
  addListener(ev, handler) {
    return this.on(ev, handler);
  }
  /**
   * Mostly identical to `EventEmitter.on`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * - Adding a 'data' event handler will trigger the flow of data
   *
   * - Adding a 'readable' event handler when there is data waiting to be read
   *   will cause 'readable' to be emitted immediately.
   *
   * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
   *   already passed will cause the event to be emitted immediately and all
   *   handlers removed.
   *
   * - Adding an 'error' event handler after an error has been emitted will
   *   cause the event to be re-emitted immediately with the error previously
   *   raised.
   */
  on(ev, handler) {
    const ret = super.on(ev, handler);
    if (ev === "data") {
      this[DISCARDED] = false;
      this[DATALISTENERS]++;
      if (!this[PIPES].length && !this[FLOWING]) {
        this[RESUME]();
      }
    } else if (ev === "readable" && this[BUFFERLENGTH] !== 0) {
      super.emit("readable");
    } else if (isEndish(ev) && this[EMITTED_END]) {
      super.emit(ev);
      this.removeAllListeners(ev);
    } else if (ev === "error" && this[EMITTED_ERROR]) {
      const h = handler;
      if (this[ASYNC])
        defer(() => h.call(this, this[EMITTED_ERROR]));
      else
        h.call(this, this[EMITTED_ERROR]);
    }
    return ret;
  }
  /**
   * Alias for {@link Minipass#off}
   */
  removeListener(ev, handler) {
    return this.off(ev, handler);
  }
  /**
   * Mostly identical to `EventEmitter.off`
   *
   * If a 'data' event handler is removed, and it was the last consumer
   * (ie, there are no pipe destinations or other 'data' event listeners),
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  off(ev, handler) {
    const ret = super.off(ev, handler);
    if (ev === "data") {
      this[DATALISTENERS] = this.listeners("data").length;
      if (this[DATALISTENERS] === 0 && !this[DISCARDED] && !this[PIPES].length) {
        this[FLOWING] = false;
      }
    }
    return ret;
  }
  /**
   * Mostly identical to `EventEmitter.removeAllListeners`
   *
   * If all 'data' event handlers are removed, and they were the last consumer
   * (ie, there are no pipe destinations), then the flow of data will stop
   * until there is another consumer or {@link Minipass#resume} is explicitly
   * called.
   */
  removeAllListeners(ev) {
    const ret = super.removeAllListeners(ev);
    if (ev === "data" || ev === void 0) {
      this[DATALISTENERS] = 0;
      if (!this[DISCARDED] && !this[PIPES].length) {
        this[FLOWING] = false;
      }
    }
    return ret;
  }
  /**
   * true if the 'end' event has been emitted
   */
  get emittedEnd() {
    return this[EMITTED_END];
  }
  [MAYBE_EMIT_END]() {
    if (!this[EMITTING_END] && !this[EMITTED_END] && !this[DESTROYED] && this[BUFFER].length === 0 && this[EOF]) {
      this[EMITTING_END] = true;
      this.emit("end");
      this.emit("prefinish");
      this.emit("finish");
      if (this[CLOSED])
        this.emit("close");
      this[EMITTING_END] = false;
    }
  }
  /**
   * Mostly identical to `EventEmitter.emit`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * If the stream has been destroyed, and the event is something other
   * than 'close' or 'error', then `false` is returned and no handlers
   * are called.
   *
   * If the event is 'end', and has already been emitted, then the event
   * is ignored. If the stream is in a paused or non-flowing state, then
   * the event will be deferred until data flow resumes. If the stream is
   * async, then handlers will be called on the next tick rather than
   * immediately.
   *
   * If the event is 'close', and 'end' has not yet been emitted, then
   * the event will be deferred until after 'end' is emitted.
   *
   * If the event is 'error', and an AbortSignal was provided for the stream,
   * and there are no listeners, then the event is ignored, matching the
   * behavior of node core streams in the presense of an AbortSignal.
   *
   * If the event is 'finish' or 'prefinish', then all listeners will be
   * removed after emitting the event, to prevent double-firing.
   */
  emit(ev, ...args) {
    const data = args[0];
    if (ev !== "error" && ev !== "close" && ev !== DESTROYED && this[DESTROYED]) {
      return false;
    } else if (ev === "data") {
      return !this[OBJECTMODE] && !data ? false : this[ASYNC] ? (defer(() => this[EMITDATA](data)), true) : this[EMITDATA](data);
    } else if (ev === "end") {
      return this[EMITEND]();
    } else if (ev === "close") {
      this[CLOSED] = true;
      if (!this[EMITTED_END] && !this[DESTROYED])
        return false;
      const ret2 = super.emit("close");
      this.removeAllListeners("close");
      return ret2;
    } else if (ev === "error") {
      this[EMITTED_ERROR] = data;
      super.emit(ERROR, data);
      const ret2 = !this[SIGNAL] || this.listeners("error").length ? super.emit("error", data) : false;
      this[MAYBE_EMIT_END]();
      return ret2;
    } else if (ev === "resume") {
      const ret2 = super.emit("resume");
      this[MAYBE_EMIT_END]();
      return ret2;
    } else if (ev === "finish" || ev === "prefinish") {
      const ret2 = super.emit(ev);
      this.removeAllListeners(ev);
      return ret2;
    }
    const ret = super.emit(ev, ...args);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [EMITDATA](data) {
    for (const p of this[PIPES]) {
      if (p.dest.write(data) === false)
        this.pause();
    }
    const ret = this[DISCARDED] ? false : super.emit("data", data);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [EMITEND]() {
    if (this[EMITTED_END])
      return false;
    this[EMITTED_END] = true;
    this.readable = false;
    return this[ASYNC] ? (defer(() => this[EMITEND2]()), true) : this[EMITEND2]();
  }
  [EMITEND2]() {
    if (this[DECODER]) {
      const data = this[DECODER].end();
      if (data) {
        for (const p of this[PIPES]) {
          p.dest.write(data);
        }
        if (!this[DISCARDED])
          super.emit("data", data);
      }
    }
    for (const p of this[PIPES]) {
      p.end();
    }
    const ret = super.emit("end");
    this.removeAllListeners("end");
    return ret;
  }
  /**
   * Return a Promise that resolves to an array of all emitted data once
   * the stream ends.
   */
  async collect() {
    const buf = Object.assign([], {
      dataLength: 0
    });
    if (!this[OBJECTMODE])
      buf.dataLength = 0;
    const p = this.promise();
    this.on("data", (c) => {
      buf.push(c);
      if (!this[OBJECTMODE])
        buf.dataLength += c.length;
    });
    await p;
    return buf;
  }
  /**
   * Return a Promise that resolves to the concatenation of all emitted data
   * once the stream ends.
   *
   * Not allowed on objectMode streams.
   */
  async concat() {
    if (this[OBJECTMODE]) {
      throw new Error("cannot concat in objectMode");
    }
    const buf = await this.collect();
    return this[ENCODING] ? buf.join("") : Buffer.concat(buf, buf.dataLength);
  }
  /**
   * Return a void Promise that resolves once the stream ends.
   */
  async promise() {
    return new Promise((resolve8, reject) => {
      this.on(DESTROYED, () => reject(new Error("stream destroyed")));
      this.on("error", (er) => reject(er));
      this.on("end", () => resolve8());
    });
  }
  /**
   * Asynchronous `for await of` iteration.
   *
   * This will continue emitting all chunks until the stream terminates.
   */
  [Symbol.asyncIterator]() {
    this[DISCARDED] = false;
    let stopped = false;
    const stop = async () => {
      this.pause();
      stopped = true;
      return { value: void 0, done: true };
    };
    const next = () => {
      if (stopped)
        return stop();
      const res = this.read();
      if (res !== null)
        return Promise.resolve({ done: false, value: res });
      if (this[EOF])
        return stop();
      let resolve8;
      let reject;
      const onerr = (er) => {
        this.off("data", ondata);
        this.off("end", onend);
        this.off(DESTROYED, ondestroy);
        stop();
        reject(er);
      };
      const ondata = (value) => {
        this.off("error", onerr);
        this.off("end", onend);
        this.off(DESTROYED, ondestroy);
        this.pause();
        resolve8({ value, done: !!this[EOF] });
      };
      const onend = () => {
        this.off("error", onerr);
        this.off("data", ondata);
        this.off(DESTROYED, ondestroy);
        stop();
        resolve8({ done: true, value: void 0 });
      };
      const ondestroy = () => onerr(new Error("stream destroyed"));
      return new Promise((res2, rej) => {
        reject = rej;
        resolve8 = res2;
        this.once(DESTROYED, ondestroy);
        this.once("error", onerr);
        this.once("end", onend);
        this.once("data", ondata);
      });
    };
    return {
      next,
      throw: stop,
      return: stop,
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  /**
   * Synchronous `for of` iteration.
   *
   * The iteration will terminate when the internal buffer runs out, even
   * if the stream has not yet terminated.
   */
  [Symbol.iterator]() {
    this[DISCARDED] = false;
    let stopped = false;
    const stop = () => {
      this.pause();
      this.off(ERROR, stop);
      this.off(DESTROYED, stop);
      this.off("end", stop);
      stopped = true;
      return { done: true, value: void 0 };
    };
    const next = () => {
      if (stopped)
        return stop();
      const value = this.read();
      return value === null ? stop() : { done: false, value };
    };
    this.once("end", stop);
    this.once(ERROR, stop);
    this.once(DESTROYED, stop);
    return {
      next,
      throw: stop,
      return: stop,
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  /**
   * Destroy a stream, preventing it from being used for any further purpose.
   *
   * If the stream has a `close()` method, then it will be called on
   * destruction.
   *
   * After destruction, any attempt to write data, read data, or emit most
   * events will be ignored.
   *
   * If an error argument is provided, then it will be emitted in an
   * 'error' event.
   */
  destroy(er) {
    if (this[DESTROYED]) {
      if (er)
        this.emit("error", er);
      else
        this.emit(DESTROYED);
      return this;
    }
    this[DESTROYED] = true;
    this[DISCARDED] = true;
    this[BUFFER].length = 0;
    this[BUFFERLENGTH] = 0;
    const wc = this;
    if (typeof wc.close === "function" && !this[CLOSED])
      wc.close();
    if (er)
      this.emit("error", er);
    else
      this.emit(DESTROYED);
    return this;
  }
  /**
   * Alias for {@link isStream}
   *
   * Former export location, maintained for backwards compatibility.
   *
   * @deprecated
   */
  static get isStream() {
    return isStream;
  }
};

// node_modules/path-scurry/dist/esm/index.js
var realpathSync = import_fs.realpathSync.native;
var defaultFS = {
  lstatSync: import_fs.lstatSync,
  readdir: import_fs.readdir,
  readdirSync: import_fs.readdirSync,
  readlinkSync: import_fs.readlinkSync,
  realpathSync,
  promises: {
    lstat: import_promises.lstat,
    readdir: import_promises.readdir,
    readlink: import_promises.readlink,
    realpath: import_promises.realpath
  }
};
var fsFromOption = (fsOption) => !fsOption || fsOption === defaultFS || fsOption === actualFS ? defaultFS : {
  ...defaultFS,
  ...fsOption,
  promises: {
    ...defaultFS.promises,
    ...fsOption.promises || {}
  }
};
var uncDriveRegexp = /^\\\\\?\\([a-z]:)\\?$/i;
var uncToDrive = (rootPath) => rootPath.replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\");
var eitherSep = /[\\\/]/;
var UNKNOWN = 0;
var IFIFO = 1;
var IFCHR = 2;
var IFDIR = 4;
var IFBLK = 6;
var IFREG = 8;
var IFLNK = 10;
var IFSOCK = 12;
var IFMT = 15;
var IFMT_UNKNOWN = ~IFMT;
var READDIR_CALLED = 16;
var LSTAT_CALLED = 32;
var ENOTDIR = 64;
var ENOENT = 128;
var ENOREADLINK = 256;
var ENOREALPATH = 512;
var ENOCHILD = ENOTDIR | ENOENT | ENOREALPATH;
var TYPEMASK = 1023;
var entToType = (s) => s.isFile() ? IFREG : s.isDirectory() ? IFDIR : s.isSymbolicLink() ? IFLNK : s.isCharacterDevice() ? IFCHR : s.isBlockDevice() ? IFBLK : s.isSocket() ? IFSOCK : s.isFIFO() ? IFIFO : UNKNOWN;
var normalizeCache = /* @__PURE__ */ new Map();
var normalize = (s) => {
  const c = normalizeCache.get(s);
  if (c)
    return c;
  const n = s.normalize("NFKD");
  normalizeCache.set(s, n);
  return n;
};
var normalizeNocaseCache = /* @__PURE__ */ new Map();
var normalizeNocase = (s) => {
  const c = normalizeNocaseCache.get(s);
  if (c)
    return c;
  const n = normalize(s.toLowerCase());
  normalizeNocaseCache.set(s, n);
  return n;
};
var ResolveCache = class extends LRUCache {
  constructor() {
    super({ max: 256 });
  }
};
var ChildrenCache = class extends LRUCache {
  constructor(maxSize = 16 * 1024) {
    super({
      maxSize,
      // parent + children
      sizeCalculation: (a) => a.length + 1
    });
  }
};
var setAsCwd = /* @__PURE__ */ Symbol("PathScurry setAsCwd");
var PathBase = class {
  /**
   * the basename of this path
   *
   * **Important**: *always* test the path name against any test string
   * usingthe {@link isNamed} method, and not by directly comparing this
   * string. Otherwise, unicode path strings that the system sees as identical
   * will not be properly treated as the same path, leading to incorrect
   * behavior and possible security issues.
   */
  name;
  /**
   * the Path entry corresponding to the path root.
   *
   * @internal
   */
  root;
  /**
   * All roots found within the current PathScurry family
   *
   * @internal
   */
  roots;
  /**
   * a reference to the parent path, or undefined in the case of root entries
   *
   * @internal
   */
  parent;
  /**
   * boolean indicating whether paths are compared case-insensitively
   * @internal
   */
  nocase;
  /**
   * boolean indicating that this path is the current working directory
   * of the PathScurry collection that contains it.
   */
  isCWD = false;
  // potential default fs override
  #fs;
  // Stats fields
  #dev;
  get dev() {
    return this.#dev;
  }
  #mode;
  get mode() {
    return this.#mode;
  }
  #nlink;
  get nlink() {
    return this.#nlink;
  }
  #uid;
  get uid() {
    return this.#uid;
  }
  #gid;
  get gid() {
    return this.#gid;
  }
  #rdev;
  get rdev() {
    return this.#rdev;
  }
  #blksize;
  get blksize() {
    return this.#blksize;
  }
  #ino;
  get ino() {
    return this.#ino;
  }
  #size;
  get size() {
    return this.#size;
  }
  #blocks;
  get blocks() {
    return this.#blocks;
  }
  #atimeMs;
  get atimeMs() {
    return this.#atimeMs;
  }
  #mtimeMs;
  get mtimeMs() {
    return this.#mtimeMs;
  }
  #ctimeMs;
  get ctimeMs() {
    return this.#ctimeMs;
  }
  #birthtimeMs;
  get birthtimeMs() {
    return this.#birthtimeMs;
  }
  #atime;
  get atime() {
    return this.#atime;
  }
  #mtime;
  get mtime() {
    return this.#mtime;
  }
  #ctime;
  get ctime() {
    return this.#ctime;
  }
  #birthtime;
  get birthtime() {
    return this.#birthtime;
  }
  #matchName;
  #depth;
  #fullpath;
  #fullpathPosix;
  #relative;
  #relativePosix;
  #type;
  #children;
  #linkTarget;
  #realpath;
  /**
   * This property is for compatibility with the Dirent class as of
   * Node v20, where Dirent['parentPath'] refers to the path of the
   * directory that was passed to readdir. For root entries, it's the path
   * to the entry itself.
   */
  get parentPath() {
    return (this.parent || this).fullpath();
  }
  /**
   * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
   * this property refers to the *parent* path, not the path object itself.
   *
   * @deprecated
   */
  get path() {
    return this.parentPath;
  }
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    this.name = name;
    this.#matchName = nocase ? normalizeNocase(name) : normalize(name);
    this.#type = type & TYPEMASK;
    this.nocase = nocase;
    this.roots = roots;
    this.root = root || this;
    this.#children = children;
    this.#fullpath = opts.fullpath;
    this.#relative = opts.relative;
    this.#relativePosix = opts.relativePosix;
    this.parent = opts.parent;
    if (this.parent) {
      this.#fs = this.parent.#fs;
    } else {
      this.#fs = fsFromOption(opts.fs);
    }
  }
  /**
   * Returns the depth of the Path object from its root.
   *
   * For example, a path at `/foo/bar` would have a depth of 2.
   */
  depth() {
    if (this.#depth !== void 0)
      return this.#depth;
    if (!this.parent)
      return this.#depth = 0;
    return this.#depth = this.parent.depth() + 1;
  }
  /**
   * @internal
   */
  childrenCache() {
    return this.#children;
  }
  /**
   * Get the Path object referenced by the string path, resolved from this Path
   */
  resolve(path2) {
    if (!path2) {
      return this;
    }
    const rootPath = this.getRootString(path2);
    const dir = path2.substring(rootPath.length);
    const dirParts = dir.split(this.splitSep);
    const result = rootPath ? this.getRoot(rootPath).#resolveParts(dirParts) : this.#resolveParts(dirParts);
    return result;
  }
  #resolveParts(dirParts) {
    let p = this;
    for (const part of dirParts) {
      p = p.child(part);
    }
    return p;
  }
  /**
   * Returns the cached children Path objects, if still available.  If they
   * have fallen out of the cache, then returns an empty array, and resets the
   * READDIR_CALLED bit, so that future calls to readdir() will require an fs
   * lookup.
   *
   * @internal
   */
  children() {
    const cached = this.#children.get(this);
    if (cached) {
      return cached;
    }
    const children = Object.assign([], { provisional: 0 });
    this.#children.set(this, children);
    this.#type &= ~READDIR_CALLED;
    return children;
  }
  /**
   * Resolves a path portion and returns or creates the child Path.
   *
   * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
   * `'..'`.
   *
   * This should not be called directly.  If `pathPart` contains any path
   * separators, it will lead to unsafe undefined behavior.
   *
   * Use `Path.resolve()` instead.
   *
   * @internal
   */
  child(pathPart, opts) {
    if (pathPart === "" || pathPart === ".") {
      return this;
    }
    if (pathPart === "..") {
      return this.parent || this;
    }
    const children = this.children();
    const name = this.nocase ? normalizeNocase(pathPart) : normalize(pathPart);
    for (const p of children) {
      if (p.#matchName === name) {
        return p;
      }
    }
    const s = this.parent ? this.sep : "";
    const fullpath = this.#fullpath ? this.#fullpath + s + pathPart : void 0;
    const pchild = this.newChild(pathPart, UNKNOWN, {
      ...opts,
      parent: this,
      fullpath
    });
    if (!this.canReaddir()) {
      pchild.#type |= ENOENT;
    }
    children.push(pchild);
    return pchild;
  }
  /**
   * The relative path from the cwd. If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpath()
   */
  relative() {
    if (this.isCWD)
      return "";
    if (this.#relative !== void 0) {
      return this.#relative;
    }
    const name = this.name;
    const p = this.parent;
    if (!p) {
      return this.#relative = this.name;
    }
    const pv = p.relative();
    return pv + (!pv || !p.parent ? "" : this.sep) + name;
  }
  /**
   * The relative path from the cwd, using / as the path separator.
   * If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpathPosix()
   * On posix systems, this is identical to relative().
   */
  relativePosix() {
    if (this.sep === "/")
      return this.relative();
    if (this.isCWD)
      return "";
    if (this.#relativePosix !== void 0)
      return this.#relativePosix;
    const name = this.name;
    const p = this.parent;
    if (!p) {
      return this.#relativePosix = this.fullpathPosix();
    }
    const pv = p.relativePosix();
    return pv + (!pv || !p.parent ? "" : "/") + name;
  }
  /**
   * The fully resolved path string for this Path entry
   */
  fullpath() {
    if (this.#fullpath !== void 0) {
      return this.#fullpath;
    }
    const name = this.name;
    const p = this.parent;
    if (!p) {
      return this.#fullpath = this.name;
    }
    const pv = p.fullpath();
    const fp = pv + (!p.parent ? "" : this.sep) + name;
    return this.#fullpath = fp;
  }
  /**
   * On platforms other than windows, this is identical to fullpath.
   *
   * On windows, this is overridden to return the forward-slash form of the
   * full UNC path.
   */
  fullpathPosix() {
    if (this.#fullpathPosix !== void 0)
      return this.#fullpathPosix;
    if (this.sep === "/")
      return this.#fullpathPosix = this.fullpath();
    if (!this.parent) {
      const p2 = this.fullpath().replace(/\\/g, "/");
      if (/^[a-z]:\//i.test(p2)) {
        return this.#fullpathPosix = `//?/${p2}`;
      } else {
        return this.#fullpathPosix = p2;
      }
    }
    const p = this.parent;
    const pfpp = p.fullpathPosix();
    const fpp = pfpp + (!pfpp || !p.parent ? "" : "/") + this.name;
    return this.#fullpathPosix = fpp;
  }
  /**
   * Is the Path of an unknown type?
   *
   * Note that we might know *something* about it if there has been a previous
   * filesystem operation, for example that it does not exist, or is not a
   * link, or whether it has child entries.
   */
  isUnknown() {
    return (this.#type & IFMT) === UNKNOWN;
  }
  isType(type) {
    return this[`is${type}`]();
  }
  getType() {
    return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : (
      /* c8 ignore start */
      this.isSocket() ? "Socket" : "Unknown"
    );
  }
  /**
   * Is the Path a regular file?
   */
  isFile() {
    return (this.#type & IFMT) === IFREG;
  }
  /**
   * Is the Path a directory?
   */
  isDirectory() {
    return (this.#type & IFMT) === IFDIR;
  }
  /**
   * Is the path a character device?
   */
  isCharacterDevice() {
    return (this.#type & IFMT) === IFCHR;
  }
  /**
   * Is the path a block device?
   */
  isBlockDevice() {
    return (this.#type & IFMT) === IFBLK;
  }
  /**
   * Is the path a FIFO pipe?
   */
  isFIFO() {
    return (this.#type & IFMT) === IFIFO;
  }
  /**
   * Is the path a socket?
   */
  isSocket() {
    return (this.#type & IFMT) === IFSOCK;
  }
  /**
   * Is the path a symbolic link?
   */
  isSymbolicLink() {
    return (this.#type & IFLNK) === IFLNK;
  }
  /**
   * Return the entry if it has been subject of a successful lstat, or
   * undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* simply
   * mean that we haven't called lstat on it.
   */
  lstatCached() {
    return this.#type & LSTAT_CALLED ? this : void 0;
  }
  /**
   * Return the cached link target if the entry has been the subject of a
   * successful readlink, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readlink() has been called at some point.
   */
  readlinkCached() {
    return this.#linkTarget;
  }
  /**
   * Returns the cached realpath target if the entry has been the subject
   * of a successful realpath, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * realpath() has been called at some point.
   */
  realpathCached() {
    return this.#realpath;
  }
  /**
   * Returns the cached child Path entries array if the entry has been the
   * subject of a successful readdir(), or [] otherwise.
   *
   * Does not read the filesystem, so an empty array *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readdir() has been called recently enough to still be valid.
   */
  readdirCached() {
    const children = this.children();
    return children.slice(0, children.provisional);
  }
  /**
   * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
   * any indication that readlink will definitely fail.
   *
   * Returns false if the path is known to not be a symlink, if a previous
   * readlink failed, or if the entry does not exist.
   */
  canReadlink() {
    if (this.#linkTarget)
      return true;
    if (!this.parent)
      return false;
    const ifmt = this.#type & IFMT;
    return !(ifmt !== UNKNOWN && ifmt !== IFLNK || this.#type & ENOREADLINK || this.#type & ENOENT);
  }
  /**
   * Return true if readdir has previously been successfully called on this
   * path, indicating that cachedReaddir() is likely valid.
   */
  calledReaddir() {
    return !!(this.#type & READDIR_CALLED);
  }
  /**
   * Returns true if the path is known to not exist. That is, a previous lstat
   * or readdir failed to verify its existence when that would have been
   * expected, or a parent entry was marked either enoent or enotdir.
   */
  isENOENT() {
    return !!(this.#type & ENOENT);
  }
  /**
   * Return true if the path is a match for the given path name.  This handles
   * case sensitivity and unicode normalization.
   *
   * Note: even on case-sensitive systems, it is **not** safe to test the
   * equality of the `.name` property to determine whether a given pathname
   * matches, due to unicode normalization mismatches.
   *
   * Always use this method instead of testing the `path.name` property
   * directly.
   */
  isNamed(n) {
    return !this.nocase ? this.#matchName === normalize(n) : this.#matchName === normalizeNocase(n);
  }
  /**
   * Return the Path object corresponding to the target of a symbolic link.
   *
   * If the Path is not a symbolic link, or if the readlink call fails for any
   * reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   */
  async readlink() {
    const target = this.#linkTarget;
    if (target) {
      return target;
    }
    if (!this.canReadlink()) {
      return void 0;
    }
    if (!this.parent) {
      return void 0;
    }
    try {
      const read = await this.#fs.promises.readlink(this.fullpath());
      const linkTarget = (await this.parent.realpath())?.resolve(read);
      if (linkTarget) {
        return this.#linkTarget = linkTarget;
      }
    } catch (er) {
      this.#readlinkFail(er.code);
      return void 0;
    }
  }
  /**
   * Synchronous {@link PathBase.readlink}
   */
  readlinkSync() {
    const target = this.#linkTarget;
    if (target) {
      return target;
    }
    if (!this.canReadlink()) {
      return void 0;
    }
    if (!this.parent) {
      return void 0;
    }
    try {
      const read = this.#fs.readlinkSync(this.fullpath());
      const linkTarget = this.parent.realpathSync()?.resolve(read);
      if (linkTarget) {
        return this.#linkTarget = linkTarget;
      }
    } catch (er) {
      this.#readlinkFail(er.code);
      return void 0;
    }
  }
  #readdirSuccess(children) {
    this.#type |= READDIR_CALLED;
    for (let p = children.provisional; p < children.length; p++) {
      const c = children[p];
      if (c)
        c.#markENOENT();
    }
  }
  #markENOENT() {
    if (this.#type & ENOENT)
      return;
    this.#type = (this.#type | ENOENT) & IFMT_UNKNOWN;
    this.#markChildrenENOENT();
  }
  #markChildrenENOENT() {
    const children = this.children();
    children.provisional = 0;
    for (const p of children) {
      p.#markENOENT();
    }
  }
  #markENOREALPATH() {
    this.#type |= ENOREALPATH;
    this.#markENOTDIR();
  }
  // save the information when we know the entry is not a dir
  #markENOTDIR() {
    if (this.#type & ENOTDIR)
      return;
    let t = this.#type;
    if ((t & IFMT) === IFDIR)
      t &= IFMT_UNKNOWN;
    this.#type = t | ENOTDIR;
    this.#markChildrenENOENT();
  }
  #readdirFail(code = "") {
    if (code === "ENOTDIR" || code === "EPERM") {
      this.#markENOTDIR();
    } else if (code === "ENOENT") {
      this.#markENOENT();
    } else {
      this.children().provisional = 0;
    }
  }
  #lstatFail(code = "") {
    if (code === "ENOTDIR") {
      const p = this.parent;
      p.#markENOTDIR();
    } else if (code === "ENOENT") {
      this.#markENOENT();
    }
  }
  #readlinkFail(code = "") {
    let ter = this.#type;
    ter |= ENOREADLINK;
    if (code === "ENOENT")
      ter |= ENOENT;
    if (code === "EINVAL" || code === "UNKNOWN") {
      ter &= IFMT_UNKNOWN;
    }
    this.#type = ter;
    if (code === "ENOTDIR" && this.parent) {
      this.parent.#markENOTDIR();
    }
  }
  #readdirAddChild(e, c) {
    return this.#readdirMaybePromoteChild(e, c) || this.#readdirAddNewChild(e, c);
  }
  #readdirAddNewChild(e, c) {
    const type = entToType(e);
    const child = this.newChild(e.name, type, { parent: this });
    const ifmt = child.#type & IFMT;
    if (ifmt !== IFDIR && ifmt !== IFLNK && ifmt !== UNKNOWN) {
      child.#type |= ENOTDIR;
    }
    c.unshift(child);
    c.provisional++;
    return child;
  }
  #readdirMaybePromoteChild(e, c) {
    for (let p = c.provisional; p < c.length; p++) {
      const pchild = c[p];
      const name = this.nocase ? normalizeNocase(e.name) : normalize(e.name);
      if (name !== pchild.#matchName) {
        continue;
      }
      return this.#readdirPromoteChild(e, pchild, p, c);
    }
  }
  #readdirPromoteChild(e, p, index, c) {
    const v = p.name;
    p.#type = p.#type & IFMT_UNKNOWN | entToType(e);
    if (v !== e.name)
      p.name = e.name;
    if (index !== c.provisional) {
      if (index === c.length - 1)
        c.pop();
      else
        c.splice(index, 1);
      c.unshift(p);
    }
    c.provisional++;
    return p;
  }
  /**
   * Call lstat() on this Path, and update all known information that can be
   * determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat() {
    if ((this.#type & ENOENT) === 0) {
      try {
        this.#applyStat(await this.#fs.promises.lstat(this.fullpath()));
        return this;
      } catch (er) {
        this.#lstatFail(er.code);
      }
    }
  }
  /**
   * synchronous {@link PathBase.lstat}
   */
  lstatSync() {
    if ((this.#type & ENOENT) === 0) {
      try {
        this.#applyStat(this.#fs.lstatSync(this.fullpath()));
        return this;
      } catch (er) {
        this.#lstatFail(er.code);
      }
    }
  }
  #applyStat(st) {
    const { atime, atimeMs, birthtime, birthtimeMs, blksize, blocks, ctime, ctimeMs, dev, gid, ino, mode, mtime, mtimeMs, nlink, rdev, size, uid } = st;
    this.#atime = atime;
    this.#atimeMs = atimeMs;
    this.#birthtime = birthtime;
    this.#birthtimeMs = birthtimeMs;
    this.#blksize = blksize;
    this.#blocks = blocks;
    this.#ctime = ctime;
    this.#ctimeMs = ctimeMs;
    this.#dev = dev;
    this.#gid = gid;
    this.#ino = ino;
    this.#mode = mode;
    this.#mtime = mtime;
    this.#mtimeMs = mtimeMs;
    this.#nlink = nlink;
    this.#rdev = rdev;
    this.#size = size;
    this.#uid = uid;
    const ifmt = entToType(st);
    this.#type = this.#type & IFMT_UNKNOWN | ifmt | LSTAT_CALLED;
    if (ifmt !== UNKNOWN && ifmt !== IFDIR && ifmt !== IFLNK) {
      this.#type |= ENOTDIR;
    }
  }
  #onReaddirCB = [];
  #readdirCBInFlight = false;
  #callOnReaddirCB(children) {
    this.#readdirCBInFlight = false;
    const cbs = this.#onReaddirCB.slice();
    this.#onReaddirCB.length = 0;
    cbs.forEach((cb) => cb(null, children));
  }
  /**
   * Standard node-style callback interface to get list of directory entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   *
   * @param cb The callback called with (er, entries).  Note that the `er`
   * param is somewhat extraneous, as all readdir() errors are handled and
   * simply result in an empty set of entries being returned.
   * @param allowZalgo Boolean indicating that immediately known results should
   * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
   * zalgo at your peril, the dark pony lord is devious and unforgiving.
   */
  readdirCB(cb, allowZalgo = false) {
    if (!this.canReaddir()) {
      if (allowZalgo)
        cb(null, []);
      else
        queueMicrotask(() => cb(null, []));
      return;
    }
    const children = this.children();
    if (this.calledReaddir()) {
      const c = children.slice(0, children.provisional);
      if (allowZalgo)
        cb(null, c);
      else
        queueMicrotask(() => cb(null, c));
      return;
    }
    this.#onReaddirCB.push(cb);
    if (this.#readdirCBInFlight) {
      return;
    }
    this.#readdirCBInFlight = true;
    const fullpath = this.fullpath();
    this.#fs.readdir(fullpath, { withFileTypes: true }, (er, entries) => {
      if (er) {
        this.#readdirFail(er.code);
        children.provisional = 0;
      } else {
        for (const e of entries) {
          this.#readdirAddChild(e, children);
        }
        this.#readdirSuccess(children);
      }
      this.#callOnReaddirCB(children.slice(0, children.provisional));
      return;
    });
  }
  #asyncReaddirInFlight;
  /**
   * Return an array of known child entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async readdir() {
    if (!this.canReaddir()) {
      return [];
    }
    const children = this.children();
    if (this.calledReaddir()) {
      return children.slice(0, children.provisional);
    }
    const fullpath = this.fullpath();
    if (this.#asyncReaddirInFlight) {
      await this.#asyncReaddirInFlight;
    } else {
      let resolve8 = () => {
      };
      this.#asyncReaddirInFlight = new Promise((res) => resolve8 = res);
      try {
        for (const e of await this.#fs.promises.readdir(fullpath, {
          withFileTypes: true
        })) {
          this.#readdirAddChild(e, children);
        }
        this.#readdirSuccess(children);
      } catch (er) {
        this.#readdirFail(er.code);
        children.provisional = 0;
      }
      this.#asyncReaddirInFlight = void 0;
      resolve8();
    }
    return children.slice(0, children.provisional);
  }
  /**
   * synchronous {@link PathBase.readdir}
   */
  readdirSync() {
    if (!this.canReaddir()) {
      return [];
    }
    const children = this.children();
    if (this.calledReaddir()) {
      return children.slice(0, children.provisional);
    }
    const fullpath = this.fullpath();
    try {
      for (const e of this.#fs.readdirSync(fullpath, {
        withFileTypes: true
      })) {
        this.#readdirAddChild(e, children);
      }
      this.#readdirSuccess(children);
    } catch (er) {
      this.#readdirFail(er.code);
      children.provisional = 0;
    }
    return children.slice(0, children.provisional);
  }
  canReaddir() {
    if (this.#type & ENOCHILD)
      return false;
    const ifmt = IFMT & this.#type;
    if (!(ifmt === UNKNOWN || ifmt === IFDIR || ifmt === IFLNK)) {
      return false;
    }
    return true;
  }
  shouldWalk(dirs, walkFilter) {
    return (this.#type & IFDIR) === IFDIR && !(this.#type & ENOCHILD) && !dirs.has(this) && (!walkFilter || walkFilter(this));
  }
  /**
   * Return the Path object corresponding to path as resolved
   * by realpath(3).
   *
   * If the realpath call fails for any reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   * On success, returns a Path object.
   */
  async realpath() {
    if (this.#realpath)
      return this.#realpath;
    if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
      return void 0;
    try {
      const rp = await this.#fs.promises.realpath(this.fullpath());
      return this.#realpath = this.resolve(rp);
    } catch (_) {
      this.#markENOREALPATH();
    }
  }
  /**
   * Synchronous {@link realpath}
   */
  realpathSync() {
    if (this.#realpath)
      return this.#realpath;
    if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
      return void 0;
    try {
      const rp = this.#fs.realpathSync(this.fullpath());
      return this.#realpath = this.resolve(rp);
    } catch (_) {
      this.#markENOREALPATH();
    }
  }
  /**
   * Internal method to mark this Path object as the scurry cwd,
   * called by {@link PathScurry#chdir}
   *
   * @internal
   */
  [setAsCwd](oldCwd) {
    if (oldCwd === this)
      return;
    oldCwd.isCWD = false;
    this.isCWD = true;
    const changed = /* @__PURE__ */ new Set([]);
    let rp = [];
    let p = this;
    while (p && p.parent) {
      changed.add(p);
      p.#relative = rp.join(this.sep);
      p.#relativePosix = rp.join("/");
      p = p.parent;
      rp.push("..");
    }
    p = oldCwd;
    while (p && p.parent && !changed.has(p)) {
      p.#relative = void 0;
      p.#relativePosix = void 0;
      p = p.parent;
    }
  }
};
var PathWin32 = class _PathWin32 extends PathBase {
  /**
   * Separator for generating path strings.
   */
  sep = "\\";
  /**
   * Separator for parsing path strings.
   */
  splitSep = eitherSep;
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    super(name, type, root, roots, nocase, children, opts);
  }
  /**
   * @internal
   */
  newChild(name, type = UNKNOWN, opts = {}) {
    return new _PathWin32(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
  }
  /**
   * @internal
   */
  getRootString(path2) {
    return import_node_path.win32.parse(path2).root;
  }
  /**
   * @internal
   */
  getRoot(rootPath) {
    rootPath = uncToDrive(rootPath.toUpperCase());
    if (rootPath === this.root.name) {
      return this.root;
    }
    for (const [compare, root] of Object.entries(this.roots)) {
      if (this.sameRoot(rootPath, compare)) {
        return this.roots[rootPath] = root;
      }
    }
    return this.roots[rootPath] = new PathScurryWin32(rootPath, this).root;
  }
  /**
   * @internal
   */
  sameRoot(rootPath, compare = this.root.name) {
    rootPath = rootPath.toUpperCase().replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\");
    return rootPath === compare;
  }
};
var PathPosix = class _PathPosix extends PathBase {
  /**
   * separator for parsing path strings
   */
  splitSep = "/";
  /**
   * separator for generating path strings
   */
  sep = "/";
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    super(name, type, root, roots, nocase, children, opts);
  }
  /**
   * @internal
   */
  getRootString(path2) {
    return path2.startsWith("/") ? "/" : "";
  }
  /**
   * @internal
   */
  getRoot(_rootPath) {
    return this.root;
  }
  /**
   * @internal
   */
  newChild(name, type = UNKNOWN, opts = {}) {
    return new _PathPosix(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
  }
};
var PathScurryBase = class {
  /**
   * The root Path entry for the current working directory of this Scurry
   */
  root;
  /**
   * The string path for the root of this Scurry's current working directory
   */
  rootPath;
  /**
   * A collection of all roots encountered, referenced by rootPath
   */
  roots;
  /**
   * The Path entry corresponding to this PathScurry's current working directory.
   */
  cwd;
  #resolveCache;
  #resolvePosixCache;
  #children;
  /**
   * Perform path comparisons case-insensitively.
   *
   * Defaults true on Darwin and Windows systems, false elsewhere.
   */
  nocase;
  #fs;
  /**
   * This class should not be instantiated directly.
   *
   * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
   *
   * @internal
   */
  constructor(cwd = process.cwd(), pathImpl, sep5, { nocase, childrenCacheSize = 16 * 1024, fs = defaultFS } = {}) {
    this.#fs = fsFromOption(fs);
    if (cwd instanceof URL || cwd.startsWith("file://")) {
      cwd = (0, import_node_url.fileURLToPath)(cwd);
    }
    const cwdPath = pathImpl.resolve(cwd);
    this.roots = /* @__PURE__ */ Object.create(null);
    this.rootPath = this.parseRootPath(cwdPath);
    this.#resolveCache = new ResolveCache();
    this.#resolvePosixCache = new ResolveCache();
    this.#children = new ChildrenCache(childrenCacheSize);
    const split = cwdPath.substring(this.rootPath.length).split(sep5);
    if (split.length === 1 && !split[0]) {
      split.pop();
    }
    if (nocase === void 0) {
      throw new TypeError("must provide nocase setting to PathScurryBase ctor");
    }
    this.nocase = nocase;
    this.root = this.newRoot(this.#fs);
    this.roots[this.rootPath] = this.root;
    let prev = this.root;
    let len = split.length - 1;
    const joinSep = pathImpl.sep;
    let abs = this.rootPath;
    let sawFirst = false;
    for (const part of split) {
      const l = len--;
      prev = prev.child(part, {
        relative: new Array(l).fill("..").join(joinSep),
        relativePosix: new Array(l).fill("..").join("/"),
        fullpath: abs += (sawFirst ? "" : joinSep) + part
      });
      sawFirst = true;
    }
    this.cwd = prev;
  }
  /**
   * Get the depth of a provided path, string, or the cwd
   */
  depth(path2 = this.cwd) {
    if (typeof path2 === "string") {
      path2 = this.cwd.resolve(path2);
    }
    return path2.depth();
  }
  /**
   * Return the cache of child entries.  Exposed so subclasses can create
   * child Path objects in a platform-specific way.
   *
   * @internal
   */
  childrenCache() {
    return this.#children;
  }
  /**
   * Resolve one or more path strings to a resolved string
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolve(...paths) {
    let r = "";
    for (let i = paths.length - 1; i >= 0; i--) {
      const p = paths[i];
      if (!p || p === ".")
        continue;
      r = r ? `${p}/${r}` : p;
      if (this.isAbsolute(p)) {
        break;
      }
    }
    const cached = this.#resolveCache.get(r);
    if (cached !== void 0) {
      return cached;
    }
    const result = this.cwd.resolve(r).fullpath();
    this.#resolveCache.set(r, result);
    return result;
  }
  /**
   * Resolve one or more path strings to a resolved string, returning
   * the posix path.  Identical to .resolve() on posix systems, but on
   * windows will return a forward-slash separated UNC path.
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolvePosix(...paths) {
    let r = "";
    for (let i = paths.length - 1; i >= 0; i--) {
      const p = paths[i];
      if (!p || p === ".")
        continue;
      r = r ? `${p}/${r}` : p;
      if (this.isAbsolute(p)) {
        break;
      }
    }
    const cached = this.#resolvePosixCache.get(r);
    if (cached !== void 0) {
      return cached;
    }
    const result = this.cwd.resolve(r).fullpathPosix();
    this.#resolvePosixCache.set(r, result);
    return result;
  }
  /**
   * find the relative path from the cwd to the supplied path string or entry
   */
  relative(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return entry.relative();
  }
  /**
   * find the relative path from the cwd to the supplied path string or
   * entry, using / as the path delimiter, even on Windows.
   */
  relativePosix(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return entry.relativePosix();
  }
  /**
   * Return the basename for the provided string or Path object
   */
  basename(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return entry.name;
  }
  /**
   * Return the dirname for the provided string or Path object
   */
  dirname(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return (entry.parent || entry).fullpath();
  }
  async readdir(entry = this.cwd, opts = {
    withFileTypes: true
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes } = opts;
    if (!entry.canReaddir()) {
      return [];
    } else {
      const p = await entry.readdir();
      return withFileTypes ? p : p.map((e) => e.name);
    }
  }
  readdirSync(entry = this.cwd, opts = {
    withFileTypes: true
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true } = opts;
    if (!entry.canReaddir()) {
      return [];
    } else if (withFileTypes) {
      return entry.readdirSync();
    } else {
      return entry.readdirSync().map((e) => e.name);
    }
  }
  /**
   * Call lstat() on the string or Path object, and update all known
   * information that can be determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return entry.lstat();
  }
  /**
   * synchronous {@link PathScurryBase.lstat}
   */
  lstatSync(entry = this.cwd) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    }
    return entry.lstatSync();
  }
  async readlink(entry = this.cwd, { withFileTypes } = {
    withFileTypes: false
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      withFileTypes = entry.withFileTypes;
      entry = this.cwd;
    }
    const e = await entry.readlink();
    return withFileTypes ? e : e?.fullpath();
  }
  readlinkSync(entry = this.cwd, { withFileTypes } = {
    withFileTypes: false
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      withFileTypes = entry.withFileTypes;
      entry = this.cwd;
    }
    const e = entry.readlinkSync();
    return withFileTypes ? e : e?.fullpath();
  }
  async realpath(entry = this.cwd, { withFileTypes } = {
    withFileTypes: false
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      withFileTypes = entry.withFileTypes;
      entry = this.cwd;
    }
    const e = await entry.realpath();
    return withFileTypes ? e : e?.fullpath();
  }
  realpathSync(entry = this.cwd, { withFileTypes } = {
    withFileTypes: false
  }) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      withFileTypes = entry.withFileTypes;
      entry = this.cwd;
    }
    const e = entry.realpathSync();
    return withFileTypes ? e : e?.fullpath();
  }
  async walk(entry = this.cwd, opts = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true, follow = false, filter: filter2, walkFilter } = opts;
    const results = [];
    if (!filter2 || filter2(entry)) {
      results.push(withFileTypes ? entry : entry.fullpath());
    }
    const dirs = /* @__PURE__ */ new Set();
    const walk = (dir, cb) => {
      dirs.add(dir);
      dir.readdirCB((er, entries) => {
        if (er) {
          return cb(er);
        }
        let len = entries.length;
        if (!len)
          return cb();
        const next = () => {
          if (--len === 0) {
            cb();
          }
        };
        for (const e of entries) {
          if (!filter2 || filter2(e)) {
            results.push(withFileTypes ? e : e.fullpath());
          }
          if (follow && e.isSymbolicLink()) {
            e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r).then((r) => r?.shouldWalk(dirs, walkFilter) ? walk(r, next) : next());
          } else {
            if (e.shouldWalk(dirs, walkFilter)) {
              walk(e, next);
            } else {
              next();
            }
          }
        }
      }, true);
    };
    const start = entry;
    return new Promise((res, rej) => {
      walk(start, (er) => {
        if (er)
          return rej(er);
        res(results);
      });
    });
  }
  walkSync(entry = this.cwd, opts = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true, follow = false, filter: filter2, walkFilter } = opts;
    const results = [];
    if (!filter2 || filter2(entry)) {
      results.push(withFileTypes ? entry : entry.fullpath());
    }
    const dirs = /* @__PURE__ */ new Set([entry]);
    for (const dir of dirs) {
      const entries = dir.readdirSync();
      for (const e of entries) {
        if (!filter2 || filter2(e)) {
          results.push(withFileTypes ? e : e.fullpath());
        }
        let r = e;
        if (e.isSymbolicLink()) {
          if (!(follow && (r = e.realpathSync())))
            continue;
          if (r.isUnknown())
            r.lstatSync();
        }
        if (r.shouldWalk(dirs, walkFilter)) {
          dirs.add(r);
        }
      }
    }
    return results;
  }
  /**
   * Support for `for await`
   *
   * Alias for {@link PathScurryBase.iterate}
   *
   * Note: As of Node 19, this is very slow, compared to other methods of
   * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
   * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
   */
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
  iterate(entry = this.cwd, options = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      options = entry;
      entry = this.cwd;
    }
    return this.stream(entry, options)[Symbol.asyncIterator]();
  }
  /**
   * Iterating over a PathScurry performs a synchronous walk.
   *
   * Alias for {@link PathScurryBase.iterateSync}
   */
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  *iterateSync(entry = this.cwd, opts = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true, follow = false, filter: filter2, walkFilter } = opts;
    if (!filter2 || filter2(entry)) {
      yield withFileTypes ? entry : entry.fullpath();
    }
    const dirs = /* @__PURE__ */ new Set([entry]);
    for (const dir of dirs) {
      const entries = dir.readdirSync();
      for (const e of entries) {
        if (!filter2 || filter2(e)) {
          yield withFileTypes ? e : e.fullpath();
        }
        let r = e;
        if (e.isSymbolicLink()) {
          if (!(follow && (r = e.realpathSync())))
            continue;
          if (r.isUnknown())
            r.lstatSync();
        }
        if (r.shouldWalk(dirs, walkFilter)) {
          dirs.add(r);
        }
      }
    }
  }
  stream(entry = this.cwd, opts = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true, follow = false, filter: filter2, walkFilter } = opts;
    const results = new Minipass({ objectMode: true });
    if (!filter2 || filter2(entry)) {
      results.write(withFileTypes ? entry : entry.fullpath());
    }
    const dirs = /* @__PURE__ */ new Set();
    const queue = [entry];
    let processing = 0;
    const process2 = () => {
      let paused = false;
      while (!paused) {
        const dir = queue.shift();
        if (!dir) {
          if (processing === 0)
            results.end();
          return;
        }
        processing++;
        dirs.add(dir);
        const onReaddir = (er, entries, didRealpaths = false) => {
          if (er)
            return results.emit("error", er);
          if (follow && !didRealpaths) {
            const promises = [];
            for (const e of entries) {
              if (e.isSymbolicLink()) {
                promises.push(e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r));
              }
            }
            if (promises.length) {
              Promise.all(promises).then(() => onReaddir(null, entries, true));
              return;
            }
          }
          for (const e of entries) {
            if (e && (!filter2 || filter2(e))) {
              if (!results.write(withFileTypes ? e : e.fullpath())) {
                paused = true;
              }
            }
          }
          processing--;
          for (const e of entries) {
            const r = e.realpathCached() || e;
            if (r.shouldWalk(dirs, walkFilter)) {
              queue.push(r);
            }
          }
          if (paused && !results.flowing) {
            results.once("drain", process2);
          } else if (!sync2) {
            process2();
          }
        };
        let sync2 = true;
        dir.readdirCB(onReaddir, true);
        sync2 = false;
      }
    };
    process2();
    return results;
  }
  streamSync(entry = this.cwd, opts = {}) {
    if (typeof entry === "string") {
      entry = this.cwd.resolve(entry);
    } else if (!(entry instanceof PathBase)) {
      opts = entry;
      entry = this.cwd;
    }
    const { withFileTypes = true, follow = false, filter: filter2, walkFilter } = opts;
    const results = new Minipass({ objectMode: true });
    const dirs = /* @__PURE__ */ new Set();
    if (!filter2 || filter2(entry)) {
      results.write(withFileTypes ? entry : entry.fullpath());
    }
    const queue = [entry];
    let processing = 0;
    const process2 = () => {
      let paused = false;
      while (!paused) {
        const dir = queue.shift();
        if (!dir) {
          if (processing === 0)
            results.end();
          return;
        }
        processing++;
        dirs.add(dir);
        const entries = dir.readdirSync();
        for (const e of entries) {
          if (!filter2 || filter2(e)) {
            if (!results.write(withFileTypes ? e : e.fullpath())) {
              paused = true;
            }
          }
        }
        processing--;
        for (const e of entries) {
          let r = e;
          if (e.isSymbolicLink()) {
            if (!(follow && (r = e.realpathSync())))
              continue;
            if (r.isUnknown())
              r.lstatSync();
          }
          if (r.shouldWalk(dirs, walkFilter)) {
            queue.push(r);
          }
        }
      }
      if (paused && !results.flowing)
        results.once("drain", process2);
    };
    process2();
    return results;
  }
  chdir(path2 = this.cwd) {
    const oldCwd = this.cwd;
    this.cwd = typeof path2 === "string" ? this.cwd.resolve(path2) : path2;
    this.cwd[setAsCwd](oldCwd);
  }
};
var PathScurryWin32 = class extends PathScurryBase {
  /**
   * separator for generating path strings
   */
  sep = "\\";
  constructor(cwd = process.cwd(), opts = {}) {
    const { nocase = true } = opts;
    super(cwd, import_node_path.win32, "\\", { ...opts, nocase });
    this.nocase = nocase;
    for (let p = this.cwd; p; p = p.parent) {
      p.nocase = this.nocase;
    }
  }
  /**
   * @internal
   */
  parseRootPath(dir) {
    return import_node_path.win32.parse(dir).root.toUpperCase();
  }
  /**
   * @internal
   */
  newRoot(fs) {
    return new PathWin32(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(p) {
    return p.startsWith("/") || p.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(p);
  }
};
var PathScurryPosix = class extends PathScurryBase {
  /**
   * separator for generating path strings
   */
  sep = "/";
  constructor(cwd = process.cwd(), opts = {}) {
    const { nocase = false } = opts;
    super(cwd, import_node_path.posix, "/", { ...opts, nocase });
    this.nocase = nocase;
  }
  /**
   * @internal
   */
  parseRootPath(_dir) {
    return "/";
  }
  /**
   * @internal
   */
  newRoot(fs) {
    return new PathPosix(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(p) {
    return p.startsWith("/");
  }
};
var PathScurryDarwin = class extends PathScurryPosix {
  constructor(cwd = process.cwd(), opts = {}) {
    const { nocase = true } = opts;
    super(cwd, { ...opts, nocase });
  }
};
var Path = process.platform === "win32" ? PathWin32 : PathPosix;
var PathScurry = process.platform === "win32" ? PathScurryWin32 : process.platform === "darwin" ? PathScurryDarwin : PathScurryPosix;

// node_modules/glob/dist/esm/pattern.js
var isPatternList = (pl) => pl.length >= 1;
var isGlobList = (gl) => gl.length >= 1;
var Pattern = class _Pattern {
  #patternList;
  #globList;
  #index;
  length;
  #platform;
  #rest;
  #globString;
  #isDrive;
  #isUNC;
  #isAbsolute;
  #followGlobstar = true;
  constructor(patternList, globList, index, platform2) {
    if (!isPatternList(patternList)) {
      throw new TypeError("empty pattern list");
    }
    if (!isGlobList(globList)) {
      throw new TypeError("empty glob list");
    }
    if (globList.length !== patternList.length) {
      throw new TypeError("mismatched pattern list and glob list lengths");
    }
    this.length = patternList.length;
    if (index < 0 || index >= this.length) {
      throw new TypeError("index out of range");
    }
    this.#patternList = patternList;
    this.#globList = globList;
    this.#index = index;
    this.#platform = platform2;
    if (this.#index === 0) {
      if (this.isUNC()) {
        const [p0, p1, p2, p3, ...prest] = this.#patternList;
        const [g0, g1, g2, g3, ...grest] = this.#globList;
        if (prest[0] === "") {
          prest.shift();
          grest.shift();
        }
        const p = [p0, p1, p2, p3, ""].join("/");
        const g = [g0, g1, g2, g3, ""].join("/");
        this.#patternList = [p, ...prest];
        this.#globList = [g, ...grest];
        this.length = this.#patternList.length;
      } else if (this.isDrive() || this.isAbsolute()) {
        const [p1, ...prest] = this.#patternList;
        const [g1, ...grest] = this.#globList;
        if (prest[0] === "") {
          prest.shift();
          grest.shift();
        }
        const p = p1 + "/";
        const g = g1 + "/";
        this.#patternList = [p, ...prest];
        this.#globList = [g, ...grest];
        this.length = this.#patternList.length;
      }
    }
  }
  /**
   * The first entry in the parsed list of patterns
   */
  pattern() {
    return this.#patternList[this.#index];
  }
  /**
   * true of if pattern() returns a string
   */
  isString() {
    return typeof this.#patternList[this.#index] === "string";
  }
  /**
   * true of if pattern() returns GLOBSTAR
   */
  isGlobstar() {
    return this.#patternList[this.#index] === GLOBSTAR;
  }
  /**
   * true if pattern() returns a regexp
   */
  isRegExp() {
    return this.#patternList[this.#index] instanceof RegExp;
  }
  /**
   * The /-joined set of glob parts that make up this pattern
   */
  globString() {
    return this.#globString = this.#globString || (this.#index === 0 ? this.isAbsolute() ? this.#globList[0] + this.#globList.slice(1).join("/") : this.#globList.join("/") : this.#globList.slice(this.#index).join("/"));
  }
  /**
   * true if there are more pattern parts after this one
   */
  hasMore() {
    return this.length > this.#index + 1;
  }
  /**
   * The rest of the pattern after this part, or null if this is the end
   */
  rest() {
    if (this.#rest !== void 0)
      return this.#rest;
    if (!this.hasMore())
      return this.#rest = null;
    this.#rest = new _Pattern(this.#patternList, this.#globList, this.#index + 1, this.#platform);
    this.#rest.#isAbsolute = this.#isAbsolute;
    this.#rest.#isUNC = this.#isUNC;
    this.#rest.#isDrive = this.#isDrive;
    return this.#rest;
  }
  /**
   * true if the pattern represents a //unc/path/ on windows
   */
  isUNC() {
    const pl = this.#patternList;
    return this.#isUNC !== void 0 ? this.#isUNC : this.#isUNC = this.#platform === "win32" && this.#index === 0 && pl[0] === "" && pl[1] === "" && typeof pl[2] === "string" && !!pl[2] && typeof pl[3] === "string" && !!pl[3];
  }
  // pattern like C:/...
  // split = ['C:', ...]
  // XXX: would be nice to handle patterns like `c:*` to test the cwd
  // in c: for *, but I don't know of a way to even figure out what that
  // cwd is without actually chdir'ing into it?
  /**
   * True if the pattern starts with a drive letter on Windows
   */
  isDrive() {
    const pl = this.#patternList;
    return this.#isDrive !== void 0 ? this.#isDrive : this.#isDrive = this.#platform === "win32" && this.#index === 0 && this.length > 1 && typeof pl[0] === "string" && /^[a-z]:$/i.test(pl[0]);
  }
  // pattern = '/' or '/...' or '/x/...'
  // split = ['', ''] or ['', ...] or ['', 'x', ...]
  // Drive and UNC both considered absolute on windows
  /**
   * True if the pattern is rooted on an absolute path
   */
  isAbsolute() {
    const pl = this.#patternList;
    return this.#isAbsolute !== void 0 ? this.#isAbsolute : this.#isAbsolute = pl[0] === "" && pl.length > 1 || this.isDrive() || this.isUNC();
  }
  /**
   * consume the root of the pattern, and return it
   */
  root() {
    const p = this.#patternList[0];
    return typeof p === "string" && this.isAbsolute() && this.#index === 0 ? p : "";
  }
  /**
   * Check to see if the current globstar pattern is allowed to follow
   * a symbolic link.
   */
  checkFollowGlobstar() {
    return !(this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar);
  }
  /**
   * Mark that the current globstar pattern is following a symbolic link
   */
  markFollowGlobstar() {
    if (this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar)
      return false;
    this.#followGlobstar = false;
    return true;
  }
};

// node_modules/glob/dist/esm/ignore.js
var defaultPlatform2 = typeof process === "object" && process && typeof process.platform === "string" ? process.platform : "linux";
var Ignore = class {
  relative;
  relativeChildren;
  absolute;
  absoluteChildren;
  platform;
  mmopts;
  constructor(ignored, { nobrace, nocase, noext, noglobstar, platform: platform2 = defaultPlatform2 }) {
    this.relative = [];
    this.absolute = [];
    this.relativeChildren = [];
    this.absoluteChildren = [];
    this.platform = platform2;
    this.mmopts = {
      dot: true,
      nobrace,
      nocase,
      noext,
      noglobstar,
      optimizationLevel: 2,
      platform: platform2,
      nocomment: true,
      nonegate: true
    };
    for (const ign of ignored)
      this.add(ign);
  }
  add(ign) {
    const mm = new Minimatch(ign, this.mmopts);
    for (let i = 0; i < mm.set.length; i++) {
      const parsed = mm.set[i];
      const globParts = mm.globParts[i];
      if (!parsed || !globParts) {
        throw new Error("invalid pattern object");
      }
      while (parsed[0] === "." && globParts[0] === ".") {
        parsed.shift();
        globParts.shift();
      }
      const p = new Pattern(parsed, globParts, 0, this.platform);
      const m = new Minimatch(p.globString(), this.mmopts);
      const children = globParts[globParts.length - 1] === "**";
      const absolute = p.isAbsolute();
      if (absolute)
        this.absolute.push(m);
      else
        this.relative.push(m);
      if (children) {
        if (absolute)
          this.absoluteChildren.push(m);
        else
          this.relativeChildren.push(m);
      }
    }
  }
  ignored(p) {
    const fullpath = p.fullpath();
    const fullpaths = `${fullpath}/`;
    const relative5 = p.relative() || ".";
    const relatives = `${relative5}/`;
    for (const m of this.relative) {
      if (m.match(relative5) || m.match(relatives))
        return true;
    }
    for (const m of this.absolute) {
      if (m.match(fullpath) || m.match(fullpaths))
        return true;
    }
    return false;
  }
  childrenIgnored(p) {
    const fullpath = p.fullpath() + "/";
    const relative5 = (p.relative() || ".") + "/";
    for (const m of this.relativeChildren) {
      if (m.match(relative5))
        return true;
    }
    for (const m of this.absoluteChildren) {
      if (m.match(fullpath))
        return true;
    }
    return false;
  }
};

// node_modules/glob/dist/esm/processor.js
var HasWalkedCache = class _HasWalkedCache {
  store;
  constructor(store = /* @__PURE__ */ new Map()) {
    this.store = store;
  }
  copy() {
    return new _HasWalkedCache(new Map(this.store));
  }
  hasWalked(target, pattern) {
    return this.store.get(target.fullpath())?.has(pattern.globString());
  }
  storeWalked(target, pattern) {
    const fullpath = target.fullpath();
    const cached = this.store.get(fullpath);
    if (cached)
      cached.add(pattern.globString());
    else
      this.store.set(fullpath, /* @__PURE__ */ new Set([pattern.globString()]));
  }
};
var MatchRecord = class {
  store = /* @__PURE__ */ new Map();
  add(target, absolute, ifDir) {
    const n = (absolute ? 2 : 0) | (ifDir ? 1 : 0);
    const current = this.store.get(target);
    this.store.set(target, current === void 0 ? n : n & current);
  }
  // match, absolute, ifdir
  entries() {
    return [...this.store.entries()].map(([path2, n]) => [
      path2,
      !!(n & 2),
      !!(n & 1)
    ]);
  }
};
var SubWalks = class {
  store = /* @__PURE__ */ new Map();
  add(target, pattern) {
    if (!target.canReaddir()) {
      return;
    }
    const subs = this.store.get(target);
    if (subs) {
      if (!subs.find((p) => p.globString() === pattern.globString())) {
        subs.push(pattern);
      }
    } else
      this.store.set(target, [pattern]);
  }
  get(target) {
    const subs = this.store.get(target);
    if (!subs) {
      throw new Error("attempting to walk unknown path");
    }
    return subs;
  }
  entries() {
    return this.keys().map((k) => [k, this.store.get(k)]);
  }
  keys() {
    return [...this.store.keys()].filter((t) => t.canReaddir());
  }
};
var Processor = class _Processor {
  hasWalkedCache;
  matches = new MatchRecord();
  subwalks = new SubWalks();
  patterns;
  follow;
  dot;
  opts;
  constructor(opts, hasWalkedCache) {
    this.opts = opts;
    this.follow = !!opts.follow;
    this.dot = !!opts.dot;
    this.hasWalkedCache = hasWalkedCache ? hasWalkedCache.copy() : new HasWalkedCache();
  }
  processPatterns(target, patterns) {
    this.patterns = patterns;
    const processingSet = patterns.map((p) => [target, p]);
    for (let [t, pattern] of processingSet) {
      this.hasWalkedCache.storeWalked(t, pattern);
      const root = pattern.root();
      const absolute = pattern.isAbsolute() && this.opts.absolute !== false;
      if (root) {
        t = t.resolve(root === "/" && this.opts.root !== void 0 ? this.opts.root : root);
        const rest2 = pattern.rest();
        if (!rest2) {
          this.matches.add(t, true, false);
          continue;
        } else {
          pattern = rest2;
        }
      }
      if (t.isENOENT())
        continue;
      let p;
      let rest;
      let changed = false;
      while (typeof (p = pattern.pattern()) === "string" && (rest = pattern.rest())) {
        const c = t.resolve(p);
        t = c;
        pattern = rest;
        changed = true;
      }
      p = pattern.pattern();
      rest = pattern.rest();
      if (changed) {
        if (this.hasWalkedCache.hasWalked(t, pattern))
          continue;
        this.hasWalkedCache.storeWalked(t, pattern);
      }
      if (typeof p === "string") {
        const ifDir = p === ".." || p === "" || p === ".";
        this.matches.add(t.resolve(p), absolute, ifDir);
        continue;
      } else if (p === GLOBSTAR) {
        if (!t.isSymbolicLink() || this.follow || pattern.checkFollowGlobstar()) {
          this.subwalks.add(t, pattern);
        }
        const rp = rest?.pattern();
        const rrest = rest?.rest();
        if (!rest || (rp === "" || rp === ".") && !rrest) {
          this.matches.add(t, absolute, rp === "" || rp === ".");
        } else {
          if (rp === "..") {
            const tp = t.parent || t;
            if (!rrest)
              this.matches.add(tp, absolute, true);
            else if (!this.hasWalkedCache.hasWalked(tp, rrest)) {
              this.subwalks.add(tp, rrest);
            }
          }
        }
      } else if (p instanceof RegExp) {
        this.subwalks.add(t, pattern);
      }
    }
    return this;
  }
  subwalkTargets() {
    return this.subwalks.keys();
  }
  child() {
    return new _Processor(this.opts, this.hasWalkedCache);
  }
  // return a new Processor containing the subwalks for each
  // child entry, and a set of matches, and
  // a hasWalkedCache that's a copy of this one
  // then we're going to call
  filterEntries(parent, entries) {
    const patterns = this.subwalks.get(parent);
    const results = this.child();
    for (const e of entries) {
      for (const pattern of patterns) {
        const absolute = pattern.isAbsolute();
        const p = pattern.pattern();
        const rest = pattern.rest();
        if (p === GLOBSTAR) {
          results.testGlobstar(e, pattern, rest, absolute);
        } else if (p instanceof RegExp) {
          results.testRegExp(e, p, rest, absolute);
        } else {
          results.testString(e, p, rest, absolute);
        }
      }
    }
    return results;
  }
  testGlobstar(e, pattern, rest, absolute) {
    if (this.dot || !e.name.startsWith(".")) {
      if (!pattern.hasMore()) {
        this.matches.add(e, absolute, false);
      }
      if (e.canReaddir()) {
        if (this.follow || !e.isSymbolicLink()) {
          this.subwalks.add(e, pattern);
        } else if (e.isSymbolicLink()) {
          if (rest && pattern.checkFollowGlobstar()) {
            this.subwalks.add(e, rest);
          } else if (pattern.markFollowGlobstar()) {
            this.subwalks.add(e, pattern);
          }
        }
      }
    }
    if (rest) {
      const rp = rest.pattern();
      if (typeof rp === "string" && // dots and empty were handled already
      rp !== ".." && rp !== "" && rp !== ".") {
        this.testString(e, rp, rest.rest(), absolute);
      } else if (rp === "..") {
        const ep = e.parent || e;
        this.subwalks.add(ep, rest);
      } else if (rp instanceof RegExp) {
        this.testRegExp(e, rp, rest.rest(), absolute);
      }
    }
  }
  testRegExp(e, p, rest, absolute) {
    if (!p.test(e.name))
      return;
    if (!rest) {
      this.matches.add(e, absolute, false);
    } else {
      this.subwalks.add(e, rest);
    }
  }
  testString(e, p, rest, absolute) {
    if (!e.isNamed(p))
      return;
    if (!rest) {
      this.matches.add(e, absolute, false);
    } else {
      this.subwalks.add(e, rest);
    }
  }
};

// node_modules/glob/dist/esm/walker.js
var makeIgnore = (ignore, opts) => typeof ignore === "string" ? new Ignore([ignore], opts) : Array.isArray(ignore) ? new Ignore(ignore, opts) : ignore;
var GlobUtil = class {
  path;
  patterns;
  opts;
  seen = /* @__PURE__ */ new Set();
  paused = false;
  aborted = false;
  #onResume = [];
  #ignore;
  #sep;
  signal;
  maxDepth;
  includeChildMatches;
  constructor(patterns, path2, opts) {
    this.patterns = patterns;
    this.path = path2;
    this.opts = opts;
    this.#sep = !opts.posix && opts.platform === "win32" ? "\\" : "/";
    this.includeChildMatches = opts.includeChildMatches !== false;
    if (opts.ignore || !this.includeChildMatches) {
      this.#ignore = makeIgnore(opts.ignore ?? [], opts);
      if (!this.includeChildMatches && typeof this.#ignore.add !== "function") {
        const m = "cannot ignore child matches, ignore lacks add() method.";
        throw new Error(m);
      }
    }
    this.maxDepth = opts.maxDepth || Infinity;
    if (opts.signal) {
      this.signal = opts.signal;
      this.signal.addEventListener("abort", () => {
        this.#onResume.length = 0;
      });
    }
  }
  #ignored(path2) {
    return this.seen.has(path2) || !!this.#ignore?.ignored?.(path2);
  }
  #childrenIgnored(path2) {
    return !!this.#ignore?.childrenIgnored?.(path2);
  }
  // backpressure mechanism
  pause() {
    this.paused = true;
  }
  resume() {
    if (this.signal?.aborted)
      return;
    this.paused = false;
    let fn = void 0;
    while (!this.paused && (fn = this.#onResume.shift())) {
      fn();
    }
  }
  onResume(fn) {
    if (this.signal?.aborted)
      return;
    if (!this.paused) {
      fn();
    } else {
      this.#onResume.push(fn);
    }
  }
  // do the requisite realpath/stat checking, and return the path
  // to add or undefined to filter it out.
  async matchCheck(e, ifDir) {
    if (ifDir && this.opts.nodir)
      return void 0;
    let rpc;
    if (this.opts.realpath) {
      rpc = e.realpathCached() || await e.realpath();
      if (!rpc)
        return void 0;
      e = rpc;
    }
    const needStat = e.isUnknown() || this.opts.stat;
    const s = needStat ? await e.lstat() : e;
    if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
      const target = await s.realpath();
      if (target && (target.isUnknown() || this.opts.stat)) {
        await target.lstat();
      }
    }
    return this.matchCheckTest(s, ifDir);
  }
  matchCheckTest(e, ifDir) {
    return e && (this.maxDepth === Infinity || e.depth() <= this.maxDepth) && (!ifDir || e.canReaddir()) && (!this.opts.nodir || !e.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !e.isSymbolicLink() || !e.realpathCached()?.isDirectory()) && !this.#ignored(e) ? e : void 0;
  }
  matchCheckSync(e, ifDir) {
    if (ifDir && this.opts.nodir)
      return void 0;
    let rpc;
    if (this.opts.realpath) {
      rpc = e.realpathCached() || e.realpathSync();
      if (!rpc)
        return void 0;
      e = rpc;
    }
    const needStat = e.isUnknown() || this.opts.stat;
    const s = needStat ? e.lstatSync() : e;
    if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
      const target = s.realpathSync();
      if (target && (target?.isUnknown() || this.opts.stat)) {
        target.lstatSync();
      }
    }
    return this.matchCheckTest(s, ifDir);
  }
  matchFinish(e, absolute) {
    if (this.#ignored(e))
      return;
    if (!this.includeChildMatches && this.#ignore?.add) {
      const ign = `${e.relativePosix()}/**`;
      this.#ignore.add(ign);
    }
    const abs = this.opts.absolute === void 0 ? absolute : this.opts.absolute;
    this.seen.add(e);
    const mark = this.opts.mark && e.isDirectory() ? this.#sep : "";
    if (this.opts.withFileTypes) {
      this.matchEmit(e);
    } else if (abs) {
      const abs2 = this.opts.posix ? e.fullpathPosix() : e.fullpath();
      this.matchEmit(abs2 + mark);
    } else {
      const rel = this.opts.posix ? e.relativePosix() : e.relative();
      const pre = this.opts.dotRelative && !rel.startsWith(".." + this.#sep) ? "." + this.#sep : "";
      this.matchEmit(!rel ? "." + mark : pre + rel + mark);
    }
  }
  async match(e, absolute, ifDir) {
    const p = await this.matchCheck(e, ifDir);
    if (p)
      this.matchFinish(p, absolute);
  }
  matchSync(e, absolute, ifDir) {
    const p = this.matchCheckSync(e, ifDir);
    if (p)
      this.matchFinish(p, absolute);
  }
  walkCB(target, patterns, cb) {
    if (this.signal?.aborted)
      cb();
    this.walkCB2(target, patterns, new Processor(this.opts), cb);
  }
  walkCB2(target, patterns, processor, cb) {
    if (this.#childrenIgnored(target))
      return cb();
    if (this.signal?.aborted)
      cb();
    if (this.paused) {
      this.onResume(() => this.walkCB2(target, patterns, processor, cb));
      return;
    }
    processor.processPatterns(target, patterns);
    let tasks = 1;
    const next = () => {
      if (--tasks === 0)
        cb();
    };
    for (const [m, absolute, ifDir] of processor.matches.entries()) {
      if (this.#ignored(m))
        continue;
      tasks++;
      this.match(m, absolute, ifDir).then(() => next());
    }
    for (const t of processor.subwalkTargets()) {
      if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
        continue;
      }
      tasks++;
      const childrenCached = t.readdirCached();
      if (t.calledReaddir())
        this.walkCB3(t, childrenCached, processor, next);
      else {
        t.readdirCB((_, entries) => this.walkCB3(t, entries, processor, next), true);
      }
    }
    next();
  }
  walkCB3(target, entries, processor, cb) {
    processor = processor.filterEntries(target, entries);
    let tasks = 1;
    const next = () => {
      if (--tasks === 0)
        cb();
    };
    for (const [m, absolute, ifDir] of processor.matches.entries()) {
      if (this.#ignored(m))
        continue;
      tasks++;
      this.match(m, absolute, ifDir).then(() => next());
    }
    for (const [target2, patterns] of processor.subwalks.entries()) {
      tasks++;
      this.walkCB2(target2, patterns, processor.child(), next);
    }
    next();
  }
  walkCBSync(target, patterns, cb) {
    if (this.signal?.aborted)
      cb();
    this.walkCB2Sync(target, patterns, new Processor(this.opts), cb);
  }
  walkCB2Sync(target, patterns, processor, cb) {
    if (this.#childrenIgnored(target))
      return cb();
    if (this.signal?.aborted)
      cb();
    if (this.paused) {
      this.onResume(() => this.walkCB2Sync(target, patterns, processor, cb));
      return;
    }
    processor.processPatterns(target, patterns);
    let tasks = 1;
    const next = () => {
      if (--tasks === 0)
        cb();
    };
    for (const [m, absolute, ifDir] of processor.matches.entries()) {
      if (this.#ignored(m))
        continue;
      this.matchSync(m, absolute, ifDir);
    }
    for (const t of processor.subwalkTargets()) {
      if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
        continue;
      }
      tasks++;
      const children = t.readdirSync();
      this.walkCB3Sync(t, children, processor, next);
    }
    next();
  }
  walkCB3Sync(target, entries, processor, cb) {
    processor = processor.filterEntries(target, entries);
    let tasks = 1;
    const next = () => {
      if (--tasks === 0)
        cb();
    };
    for (const [m, absolute, ifDir] of processor.matches.entries()) {
      if (this.#ignored(m))
        continue;
      this.matchSync(m, absolute, ifDir);
    }
    for (const [target2, patterns] of processor.subwalks.entries()) {
      tasks++;
      this.walkCB2Sync(target2, patterns, processor.child(), next);
    }
    next();
  }
};
var GlobWalker = class extends GlobUtil {
  matches = /* @__PURE__ */ new Set();
  constructor(patterns, path2, opts) {
    super(patterns, path2, opts);
  }
  matchEmit(e) {
    this.matches.add(e);
  }
  async walk() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    if (this.path.isUnknown()) {
      await this.path.lstat();
    }
    await new Promise((res, rej) => {
      this.walkCB(this.path, this.patterns, () => {
        if (this.signal?.aborted) {
          rej(this.signal.reason);
        } else {
          res(this.matches);
        }
      });
    });
    return this.matches;
  }
  walkSync() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    if (this.path.isUnknown()) {
      this.path.lstatSync();
    }
    this.walkCBSync(this.path, this.patterns, () => {
      if (this.signal?.aborted)
        throw this.signal.reason;
    });
    return this.matches;
  }
};
var GlobStream = class extends GlobUtil {
  results;
  constructor(patterns, path2, opts) {
    super(patterns, path2, opts);
    this.results = new Minipass({
      signal: this.signal,
      objectMode: true
    });
    this.results.on("drain", () => this.resume());
    this.results.on("resume", () => this.resume());
  }
  matchEmit(e) {
    this.results.write(e);
    if (!this.results.flowing)
      this.pause();
  }
  stream() {
    const target = this.path;
    if (target.isUnknown()) {
      target.lstat().then(() => {
        this.walkCB(target, this.patterns, () => this.results.end());
      });
    } else {
      this.walkCB(target, this.patterns, () => this.results.end());
    }
    return this.results;
  }
  streamSync() {
    if (this.path.isUnknown()) {
      this.path.lstatSync();
    }
    this.walkCBSync(this.path, this.patterns, () => this.results.end());
    return this.results;
  }
};

// node_modules/glob/dist/esm/glob.js
var defaultPlatform3 = typeof process === "object" && process && typeof process.platform === "string" ? process.platform : "linux";
var Glob = class {
  absolute;
  cwd;
  root;
  dot;
  dotRelative;
  follow;
  ignore;
  magicalBraces;
  mark;
  matchBase;
  maxDepth;
  nobrace;
  nocase;
  nodir;
  noext;
  noglobstar;
  pattern;
  platform;
  realpath;
  scurry;
  stat;
  signal;
  windowsPathsNoEscape;
  withFileTypes;
  includeChildMatches;
  /**
   * The options provided to the constructor.
   */
  opts;
  /**
   * An array of parsed immutable {@link Pattern} objects.
   */
  patterns;
  /**
   * All options are stored as properties on the `Glob` object.
   *
   * See {@link GlobOptions} for full options descriptions.
   *
   * Note that a previous `Glob` object can be passed as the
   * `GlobOptions` to another `Glob` instantiation to re-use settings
   * and caches with a new pattern.
   *
   * Traversal functions can be called multiple times to run the walk
   * again.
   */
  constructor(pattern, opts) {
    if (!opts)
      throw new TypeError("glob options required");
    this.withFileTypes = !!opts.withFileTypes;
    this.signal = opts.signal;
    this.follow = !!opts.follow;
    this.dot = !!opts.dot;
    this.dotRelative = !!opts.dotRelative;
    this.nodir = !!opts.nodir;
    this.mark = !!opts.mark;
    if (!opts.cwd) {
      this.cwd = "";
    } else if (opts.cwd instanceof URL || opts.cwd.startsWith("file://")) {
      opts.cwd = (0, import_node_url2.fileURLToPath)(opts.cwd);
    }
    this.cwd = opts.cwd || "";
    this.root = opts.root;
    this.magicalBraces = !!opts.magicalBraces;
    this.nobrace = !!opts.nobrace;
    this.noext = !!opts.noext;
    this.realpath = !!opts.realpath;
    this.absolute = opts.absolute;
    this.includeChildMatches = opts.includeChildMatches !== false;
    this.noglobstar = !!opts.noglobstar;
    this.matchBase = !!opts.matchBase;
    this.maxDepth = typeof opts.maxDepth === "number" ? opts.maxDepth : Infinity;
    this.stat = !!opts.stat;
    this.ignore = opts.ignore;
    if (this.withFileTypes && this.absolute !== void 0) {
      throw new Error("cannot set absolute and withFileTypes:true");
    }
    if (typeof pattern === "string") {
      pattern = [pattern];
    }
    this.windowsPathsNoEscape = !!opts.windowsPathsNoEscape || opts.allowWindowsEscape === false;
    if (this.windowsPathsNoEscape) {
      pattern = pattern.map((p) => p.replace(/\\/g, "/"));
    }
    if (this.matchBase) {
      if (opts.noglobstar) {
        throw new TypeError("base matching requires globstar");
      }
      pattern = pattern.map((p) => p.includes("/") ? p : `./**/${p}`);
    }
    this.pattern = pattern;
    this.platform = opts.platform || defaultPlatform3;
    this.opts = { ...opts, platform: this.platform };
    if (opts.scurry) {
      this.scurry = opts.scurry;
      if (opts.nocase !== void 0 && opts.nocase !== opts.scurry.nocase) {
        throw new Error("nocase option contradicts provided scurry option");
      }
    } else {
      const Scurry = opts.platform === "win32" ? PathScurryWin32 : opts.platform === "darwin" ? PathScurryDarwin : opts.platform ? PathScurryPosix : PathScurry;
      this.scurry = new Scurry(this.cwd, {
        nocase: opts.nocase,
        fs: opts.fs
      });
    }
    this.nocase = this.scurry.nocase;
    const nocaseMagicOnly = this.platform === "darwin" || this.platform === "win32";
    const mmo = {
      // default nocase based on platform
      ...opts,
      dot: this.dot,
      matchBase: this.matchBase,
      nobrace: this.nobrace,
      nocase: this.nocase,
      nocaseMagicOnly,
      nocomment: true,
      noext: this.noext,
      nonegate: true,
      optimizationLevel: 2,
      platform: this.platform,
      windowsPathsNoEscape: this.windowsPathsNoEscape,
      debug: !!this.opts.debug
    };
    const mms = this.pattern.map((p) => new Minimatch(p, mmo));
    const [matchSet, globParts] = mms.reduce((set, m) => {
      set[0].push(...m.set);
      set[1].push(...m.globParts);
      return set;
    }, [[], []]);
    this.patterns = matchSet.map((set, i) => {
      const g = globParts[i];
      if (!g)
        throw new Error("invalid pattern object");
      return new Pattern(set, g, 0, this.platform);
    });
  }
  async walk() {
    return [
      ...await new GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walk()
    ];
  }
  walkSync() {
    return [
      ...new GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walkSync()
    ];
  }
  stream() {
    return new GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).stream();
  }
  streamSync() {
    return new GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).streamSync();
  }
  /**
   * Default sync iteration function. Returns a Generator that
   * iterates over the results.
   */
  iterateSync() {
    return this.streamSync()[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  /**
   * Default async iteration function. Returns an AsyncGenerator that
   * iterates over the results.
   */
  iterate() {
    return this.stream()[Symbol.asyncIterator]();
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
};

// node_modules/glob/dist/esm/has-magic.js
var hasMagic = (pattern, options = {}) => {
  if (!Array.isArray(pattern)) {
    pattern = [pattern];
  }
  for (const p of pattern) {
    if (new Minimatch(p, options).hasMagic())
      return true;
  }
  return false;
};

// node_modules/glob/dist/esm/index.js
function globStreamSync(pattern, options = {}) {
  return new Glob(pattern, options).streamSync();
}
function globStream(pattern, options = {}) {
  return new Glob(pattern, options).stream();
}
function globSync(pattern, options = {}) {
  return new Glob(pattern, options).walkSync();
}
async function glob_(pattern, options = {}) {
  return new Glob(pattern, options).walk();
}
function globIterateSync(pattern, options = {}) {
  return new Glob(pattern, options).iterateSync();
}
function globIterate(pattern, options = {}) {
  return new Glob(pattern, options).iterate();
}
var streamSync = globStreamSync;
var stream = Object.assign(globStream, { sync: globStreamSync });
var iterateSync = globIterateSync;
var iterate = Object.assign(globIterate, {
  sync: globIterateSync
});
var sync = Object.assign(globSync, {
  stream: globStreamSync,
  iterate: globIterateSync
});
var glob = Object.assign(glob_, {
  glob: glob_,
  globSync,
  sync,
  globStream,
  stream,
  globStreamSync,
  streamSync,
  globIterate,
  iterate,
  globIterateSync,
  iterateSync,
  Glob,
  hasMagic,
  escape,
  unescape
});
glob.glob = glob;

// src/cds/compiler/command.ts
var import_child_process = require("child_process");
var import_fs3 = require("fs");
var import_path2 = require("path");

// src/filesystem.ts
var import_fs2 = require("fs");
var import_path = require("path");

// src/constants.ts
var modelCdsJsonFile = "model.cds.json";
var cdsExtractorMarkerFileName = "cds-extractor-marker.js";
var cdsExtractorMarkerFileContent = '"Placeholder content created by the CDS extractor. This file can be safely deleted.";';

// src/logging/cdsExtractorLog.ts
var sourceRootDirectory;
var sessionId = Date.now().toString();
var extractorStartTime = Date.now();
var performanceTracking = /* @__PURE__ */ new Map();
function cdsExtractorLog(level, message, ...optionalParams) {
  if (!sourceRootDirectory) {
    throw new Error("Source root directory is not set. Call setSourceRootDirectory() first.");
  }
  const currentTime = Date.now();
  const elapsedMs = currentTime - extractorStartTime;
  const levelPrefix = `[CDS-${sessionId} ${elapsedMs}] ${level.toUpperCase()}: `;
  switch (level) {
    case "debug":
    case "info":
      if (typeof message === "string") {
        console.log(levelPrefix + message, ...optionalParams);
      } else {
        console.log(levelPrefix, message, ...optionalParams);
      }
      break;
    case "warn":
      if (typeof message === "string") {
        console.warn(levelPrefix + message, ...optionalParams);
      } else {
        console.warn(levelPrefix, message, ...optionalParams);
      }
      break;
    case "error":
      if (typeof message === "string") {
        console.error(levelPrefix + message, ...optionalParams);
      } else {
        console.error(levelPrefix, message, ...optionalParams);
      }
      break;
    default:
      throw new Error(`Invalid log level: ${String(level)}`);
  }
}
function formatDuration(startTime, endTime = Date.now()) {
  const durationMs = endTime - startTime;
  if (durationMs < 1e3) {
    return `${durationMs}ms`;
  } else if (durationMs < 6e4) {
    return `${(durationMs / 1e3).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 6e4);
    const seconds = (durationMs % 6e4 / 1e3).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}
function logExtractorStart(sourceRoot2) {
  cdsExtractorLog("info", `=== CDS EXTRACTOR START [${sessionId}] ===`);
  cdsExtractorLog("info", `Source Root: ${sourceRoot2}`);
}
function logExtractorStop(success = true, additionalSummary) {
  const endTime = Date.now();
  const totalDuration = formatDuration(extractorStartTime, endTime);
  const status = success ? "SUCCESS" : "FAILURE";
  if (additionalSummary) {
    cdsExtractorLog("info", additionalSummary);
  }
  cdsExtractorLog("info", `=== CDS EXTRACTOR END [${sessionId}] - ${status} ===`);
  cdsExtractorLog("info", `Total Duration: ${totalDuration}`);
}
function logPerformanceMilestone(milestone, additionalInfo) {
  const currentTime = Date.now();
  const overallDuration = formatDuration(extractorStartTime, currentTime);
  const info = additionalInfo ? ` - ${additionalInfo}` : "";
  cdsExtractorLog("info", `MILESTONE: ${milestone} (after ${overallDuration})${info}`);
}
function logPerformanceTrackingStart(operationName) {
  performanceTracking.set(operationName, Date.now());
  cdsExtractorLog("debug", `Started: ${operationName}`);
}
function logPerformanceTrackingStop(operationName) {
  const startTime = performanceTracking.get(operationName);
  if (startTime) {
    const duration = formatDuration(startTime);
    performanceTracking.delete(operationName);
    cdsExtractorLog("info", `Completed: ${operationName} (took ${duration})`);
  } else {
    cdsExtractorLog("warn", `No start time found for operation: ${operationName}`);
  }
}
function setSourceRootDirectory(sourceRoot2) {
  sourceRootDirectory = sourceRoot2;
}

// src/logging/statusReport.ts
function generateStatusReport(dependencyGraph2) {
  const summary = dependencyGraph2.statusSummary;
  const lines = [];
  lines.push("=".repeat(80));
  lines.push(`CDS EXTRACTOR STATUS REPORT`);
  lines.push("=".repeat(80));
  lines.push("");
  lines.push("OVERALL SUMMARY:");
  lines.push(`  Status: ${summary.overallSuccess ? "SUCCESS" : "FAILED"}`);
  lines.push(`  Current Phase: ${dependencyGraph2.currentPhase.toUpperCase()}`);
  lines.push(`  Projects: ${summary.totalProjects}`);
  lines.push(`  CDS Files: ${summary.totalCdsFiles}`);
  lines.push(`  JSON Files Generated: ${summary.jsonFilesGenerated}`);
  lines.push("");
  lines.push("COMPILATION SUMMARY:");
  lines.push(`  Total Tasks: ${summary.totalCompilationTasks}`);
  lines.push(`  Successful: ${summary.successfulCompilations}`);
  lines.push(`  Retried: ${dependencyGraph2.retryStatus.totalRetryAttempts}`);
  lines.push(`  Failed: ${summary.failedCompilations}`);
  lines.push(`  Skipped: ${summary.skippedCompilations}`);
  lines.push("");
  if (dependencyGraph2.retryStatus.totalRetryAttempts > 0) {
    lines.push("RETRY SUMMARY:");
    lines.push(`  Tasks Requiring Retry: ${dependencyGraph2.retryStatus.totalTasksRequiringRetry}`);
    lines.push(
      `  Tasks Successfully Retried: ${dependencyGraph2.retryStatus.totalTasksSuccessfullyRetried}`
    );
    lines.push(`  Total Retry Attempts: ${dependencyGraph2.retryStatus.totalRetryAttempts}`);
    lines.push(
      `  Projects Requiring Full Dependencies: ${dependencyGraph2.retryStatus.projectsRequiringFullDependencies.size}`
    );
    lines.push(
      `  Projects with Full Dependencies: ${dependencyGraph2.retryStatus.projectsWithFullDependencies.size}`
    );
    lines.push("");
  }
  lines.push("PERFORMANCE:");
  lines.push(`  Total Duration: ${summary.performance.totalDurationMs}ms`);
  lines.push(`  Parsing: ${summary.performance.parsingDurationMs}ms`);
  lines.push(`  Compilation: ${summary.performance.compilationDurationMs}ms`);
  lines.push(`  Extraction: ${summary.performance.extractionDurationMs}ms`);
  if (summary.performance.totalDurationMs > 0) {
    const parsingPct = Math.round(
      summary.performance.parsingDurationMs / summary.performance.totalDurationMs * 100
    );
    const compilationPct = Math.round(
      summary.performance.compilationDurationMs / summary.performance.totalDurationMs * 100
    );
    const extractionPct = Math.round(
      summary.performance.extractionDurationMs / summary.performance.totalDurationMs * 100
    );
    lines.push("  Breakdown:");
    lines.push(`    Parsing: ${parsingPct}%`);
    lines.push(`    Compilation: ${compilationPct}%`);
    lines.push(`    Extraction: ${extractionPct}%`);
  }
  lines.push("");
  if (summary.criticalErrors.length > 0) {
    lines.push("CRITICAL ERRORS:");
    for (const error of summary.criticalErrors) {
      lines.push(`  - ${error}`);
    }
    lines.push("");
  }
  if (summary.warnings.length > 0) {
    lines.push("WARNINGS:");
    for (const warning of summary.warnings) {
      lines.push(`  - ${warning}`);
    }
    lines.push("");
  }
  lines.push("=".repeat(80));
  return lines.join("\n");
}

// src/filesystem.ts
function dirExists(dirPath) {
  return (0, import_fs2.existsSync)(dirPath) && (0, import_fs2.statSync)(dirPath).isDirectory();
}
function fileExists(filePath) {
  return (0, import_fs2.existsSync)(filePath) && (0, import_fs2.statSync)(filePath).isFile();
}
function recursivelyRenameJsonFiles(dirPath) {
  if (!dirExists(dirPath)) {
    cdsExtractorLog("info", `Directory not found: ${dirPath}`);
    return;
  }
  cdsExtractorLog("info", `Processing JSON files in directory: ${dirPath}`);
  const entries = (0, import_fs2.readdirSync)(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = (0, import_path.join)(dirPath, entry.name);
    if (entry.isDirectory()) {
      recursivelyRenameJsonFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith(".cds.json")) {
      const newPath = (0, import_path.format)({ ...(0, import_path.parse)(fullPath), base: "", ext: ".cds.json" });
      (0, import_fs2.renameSync)(fullPath, newPath);
      cdsExtractorLog("info", `Renamed CDS output file from ${fullPath} to ${newPath}`);
    }
  }
}
function createMarkerFile(sourceRoot2) {
  const markerFilePath = (0, import_path.join)(sourceRoot2, cdsExtractorMarkerFileName);
  try {
    (0, import_fs2.writeFileSync)(markerFilePath, cdsExtractorMarkerFileContent, "utf8");
    cdsExtractorLog("info", `Created marker file: ${markerFilePath}`);
  } catch (error) {
    cdsExtractorLog("warn", `Failed to create marker file: ${String(error)}`);
  }
  return markerFilePath;
}
function removeMarkerFile(markerFilePath) {
  if ((0, import_fs2.existsSync)(markerFilePath)) {
    try {
      (0, import_fs2.unlinkSync)(markerFilePath);
      cdsExtractorLog("info", `Removed marker file: ${markerFilePath}`);
    } catch (error) {
      cdsExtractorLog("warn", `Failed to remove marker file: ${String(error)}`);
    }
  }
}
function normalizeCdsJsonLocations(data) {
  if (typeof data !== "object" || data === null) return data;
  const topLoc = data["$location"];
  if (topLoc?.file && typeof topLoc.file === "string") {
    topLoc.file = topLoc.file.split("\\").join("/");
  }
  const definitions = data["definitions"];
  if (definitions) {
    for (const defn of Object.values(definitions)) {
      normalizeLocationsRecursive(defn);
    }
  }
  return data;
}
function normalizeLocationsRecursive(obj) {
  if (typeof obj !== "object" || obj === null) return;
  const record = obj;
  const loc = record["$location"];
  if (loc?.file && typeof loc.file === "string") {
    loc.file = loc.file.split("\\").join("/");
  }
  for (const key of ["elements", "params", "actions", "functions", "items", "returns"]) {
    const nested = record[key];
    if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      for (const child of Object.values(nested)) {
        normalizeLocationsRecursive(child);
      }
    }
  }
}
function normalizeLocationPathsInFile(filePath) {
  if (!fileExists(filePath)) return;
  const raw = (0, import_fs2.readFileSync)(filePath, "utf8");
  const data = JSON.parse(raw);
  normalizeCdsJsonLocations(data);
  const normalized = JSON.stringify(data, null, 2) + "\n";
  if (normalized !== raw) {
    (0, import_fs2.writeFileSync)(filePath, normalized, "utf8");
    cdsExtractorLog("info", `Normalized $location paths in: ${filePath}`);
  }
}

// src/cds/compiler/command.ts
var DEFAULT_COMMAND_TIMEOUT_MS = 1e4;
var cdsCommandCache = {
  commandResults: /* @__PURE__ */ new Map(),
  availableCacheDirs: [],
  initialized: false
};
var createCdsCommands = {
  // Global CDS command
  cds: () => ({
    executable: "cds",
    args: [],
    originalCommand: "cds"
  }),
  // NPX with @sap/cds package
  npxCds: () => ({
    executable: "npx",
    args: ["--yes", "--package", "@sap/cds", "cds"],
    originalCommand: "npx --yes --package @sap/cds cds"
  }),
  // NPX with @sap/cds-dk package
  npxCdsDk: () => ({
    executable: "npx",
    args: ["--yes", "--package", "@sap/cds-dk", "cds"],
    originalCommand: "npx --yes --package @sap/cds-dk cds"
  }),
  // NPX with @sap/cds-dk package (alternative flag)
  npxCdsDkAlt: () => ({
    executable: "npx",
    args: ["--yes", "@sap/cds-dk", "cds"],
    originalCommand: "npx --yes @sap/cds-dk cds"
  }),
  // NPX with versioned @sap/cds-dk package
  npxCdsDkWithVersion: (version) => ({
    executable: "npx",
    args: ["--yes", "--package", `@sap/cds-dk@${version}`, "cds"],
    originalCommand: `npx --yes --package @sap/cds-dk@${version} cds`
  }),
  // NPX with versioned @sap/cds package
  npxCdsWithVersion: (version) => ({
    executable: "npx",
    args: ["--yes", "--package", `@sap/cds@${version}`, "cds"],
    originalCommand: `npx --yes --package @sap/cds@${version} cds`
  })
};
function parseCommandString(commandString) {
  const parts = commandString.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error("Empty command string");
  }
  const executable = parts[0];
  const args = parts.slice(1);
  return {
    executable,
    args,
    originalCommand: commandString
  };
}
function determineVersionAwareCdsCommands(cacheDir, sourceRoot2, projectPath, dependencyGraph2) {
  try {
    const commandString = getBestCdsCommand(cacheDir, sourceRoot2, projectPath, dependencyGraph2);
    const primaryCommand = parseCommandString(commandString);
    let retryCommand;
    if (projectPath && dependencyGraph2) {
      try {
        const versionInfo = resolveCdsVersions(projectPath, dependencyGraph2);
        if (versionInfo?.preferredDkVersion) {
          retryCommand = createCdsCommands.npxCdsDkWithVersion(versionInfo.preferredDkVersion);
        } else if (versionInfo?.cdsDkVersion) {
          retryCommand = createCdsCommands.npxCdsDkWithVersion(versionInfo.cdsDkVersion);
        } else {
          retryCommand = createCdsCommands.npxCdsDk();
        }
      } catch (error) {
        cdsExtractorLog(
          "warn",
          `Failed to resolve version info for ${projectPath}: ${String(error)}`
        );
        retryCommand = createCdsCommands.npxCdsDk();
      }
    } else {
      retryCommand = createCdsCommands.npxCdsDk();
    }
    return { primaryCommand, retryCommand };
  } catch (error) {
    cdsExtractorLog("error", `Failed to determine version-aware commands: ${String(error)}`);
    const fallbackCommand = parseCommandString("cds");
    return {
      primaryCommand: fallbackCommand,
      retryCommand: createCdsCommands.npxCdsDk()
    };
  }
}
function createCdsCommandForPath(absolutePath) {
  try {
    const resolvedPath = (0, import_path2.resolve)(absolutePath);
    if (resolvedPath && fileExists(resolvedPath)) {
      return {
        executable: resolvedPath,
        args: [],
        originalCommand: absolutePath
      };
    }
  } catch {
  }
  return null;
}
function resolveCdsVersions(projectPath, dependencyGraph2) {
  const project = dependencyGraph2.projects.get(projectPath);
  if (!project?.packageJson) {
    return void 0;
  }
  const { dependencies = {}, devDependencies = {} } = project.packageJson;
  const allDependencies = { ...dependencies, ...devDependencies };
  const cdsVersion = allDependencies["@sap/cds"];
  const cdsDkVersion = allDependencies["@sap/cds-dk"];
  if (!cdsVersion && !cdsDkVersion) {
    return void 0;
  }
  let preferredDkVersion;
  if (cdsDkVersion) {
    preferredDkVersion = enforceMinimumCdsDkVersion(cdsDkVersion);
  } else if (cdsVersion) {
    preferredDkVersion = deriveCompatibleCdsDkVersion(cdsVersion);
  }
  return {
    cdsVersion,
    cdsDkVersion,
    preferredDkVersion
  };
}
function enforceMinimumCdsDkVersion(version) {
  const minimumVersion = 8;
  const majorVersionMatch = version.match(/\^?(\d+)/);
  if (majorVersionMatch) {
    const majorVersion = parseInt(majorVersionMatch[1], 10);
    if (majorVersion < minimumVersion) {
      return `^${minimumVersion}`;
    }
  }
  return version;
}
function deriveCompatibleCdsDkVersion(cdsVersion) {
  const majorVersionMatch = cdsVersion.match(/\^?(\d+)/);
  let derivedVersion;
  if (majorVersionMatch) {
    const majorVersion = majorVersionMatch[1];
    derivedVersion = `^${majorVersion}`;
  } else {
    derivedVersion = cdsVersion;
  }
  return enforceMinimumCdsDkVersion(derivedVersion);
}
function createVersionAwareCdsCommand(projectPath, dependencyGraph2) {
  const versionInfo = resolveCdsVersions(projectPath, dependencyGraph2);
  if (!versionInfo?.preferredDkVersion) {
    return null;
  }
  return createCdsCommands.npxCdsDkWithVersion(versionInfo.preferredDkVersion);
}
function determineCdsCommand(cacheDir, sourceRoot2, projectPath, dependencyGraph2) {
  try {
    return getBestCdsCommand(cacheDir, sourceRoot2, projectPath, dependencyGraph2);
  } catch (error) {
    const errorMessage = `Failed to determine CDS command: ${String(error)}`;
    cdsExtractorLog("error", errorMessage);
    throw new Error(errorMessage);
  }
}
function discoverAvailableCacheDirs(sourceRoot2) {
  if (cdsCommandCache.availableCacheDirs.length > 0) {
    return cdsCommandCache.availableCacheDirs;
  }
  const cacheRootDir = (0, import_path2.join)(sourceRoot2, ".cds-extractor-cache");
  const availableDirs = [];
  try {
    if ((0, import_fs3.existsSync)(cacheRootDir)) {
      const entries = (0, import_fs3.readdirSync)(cacheRootDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("cds-")) {
          const cacheDir = (0, import_path2.join)(cacheRootDir, entry.name);
          const cdsBin = (0, import_path2.join)(cacheDir, "node_modules", ".bin", "cds");
          if (fileExists(cdsBin)) {
            availableDirs.push(cacheDir);
          }
        }
      }
    }
  } catch (error) {
    cdsExtractorLog("debug", `Failed to discover cache directories: ${String(error)}`);
  }
  cdsCommandCache.availableCacheDirs = availableDirs;
  return availableDirs;
}
function getBestCdsCommand(cacheDir, sourceRoot2, projectPath, dependencyGraph2) {
  initializeCdsCommandCache(sourceRoot2);
  if (cacheDir) {
    const localCdsBin = (0, import_path2.join)(cacheDir, "node_modules", ".bin", "cds");
    const command = createCdsCommandForPath(localCdsBin);
    if (command) {
      const result = testCdsCommand(command, sourceRoot2, true);
      if (result.works) {
        return localCdsBin;
      }
    }
  }
  for (const availableCacheDir of cdsCommandCache.availableCacheDirs) {
    const localCdsBin = (0, import_path2.join)(availableCacheDir, "node_modules", ".bin", "cds");
    const command = createCdsCommandForPath(localCdsBin);
    if (command) {
      const result = testCdsCommand(command, sourceRoot2, true);
      if (result.works) {
        return localCdsBin;
      }
    }
  }
  if (projectPath && dependencyGraph2) {
    const versionAwareCommand = createVersionAwareCdsCommand(projectPath, dependencyGraph2);
    if (versionAwareCommand) {
      const result = testCdsCommand(versionAwareCommand, sourceRoot2, true);
      if (result.works) {
        return versionAwareCommand.originalCommand;
      }
    }
  }
  if (cdsCommandCache.globalCommand) {
    return cdsCommandCache.globalCommand;
  }
  const fallbackCommands = [createCdsCommands.npxCds(), createCdsCommands.npxCdsDk()];
  for (const command of fallbackCommands) {
    const result = testCdsCommand(command, sourceRoot2, true);
    if (result.works) {
      return command.originalCommand;
    }
  }
  return createCdsCommands.npxCdsDk().originalCommand;
}
function initializeCdsCommandCache(sourceRoot2) {
  if (cdsCommandCache.initialized) {
    return;
  }
  cdsExtractorLog("info", "Initializing CDS command cache...");
  const globalCommands = [createCdsCommands.cds(), createCdsCommands.npxCdsDk()];
  for (const command of globalCommands) {
    const result = testCdsCommand(command, sourceRoot2, true);
    if (result.works) {
      cdsCommandCache.globalCommand = command.originalCommand;
      cdsExtractorLog(
        "info",
        `Found working global CDS command: ${command.originalCommand} (v${result.version ?? "unknown"})`
      );
      break;
    }
  }
  const cacheDirs = discoverAvailableCacheDirs(sourceRoot2);
  if (cacheDirs.length > 0) {
    cdsExtractorLog(
      "info",
      `Discovered ${cacheDirs.length} CDS cache director${cacheDirs.length === 1 ? "y" : "ies"}`
    );
  }
  cdsCommandCache.initialized = true;
}
function testCdsCommand(validatedCommand, sourceRoot2, silent = false) {
  const cacheKey = validatedCommand.originalCommand;
  const cachedResult = cdsCommandCache.commandResults.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  try {
    const cleanEnv = {
      ...process.env,
      // Remove any CodeQL-specific environment variables that might interfere.
      CODEQL_EXTRACTOR_CDS_WIP_DATABASE: void 0,
      CODEQL_RUNNER: void 0
    };
    const result = (0, import_child_process.execFileSync)(
      validatedCommand.executable,
      [...validatedCommand.args, "--version"],
      {
        encoding: "utf8",
        stdio: "pipe",
        timeout: DEFAULT_COMMAND_TIMEOUT_MS,
        // timeout after 10 seconds
        cwd: sourceRoot2,
        env: cleanEnv
      }
    ).toString();
    const versionMatch = result.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : void 0;
    const testResult = { works: true, version };
    cdsCommandCache.commandResults.set(cacheKey, testResult);
    return testResult;
  } catch (error) {
    const errorMessage = String(error);
    if (!silent) {
      cdsExtractorLog("debug", `CDS command test failed for '${cacheKey}': ${errorMessage}`);
    }
    const testResult = { works: false, error: errorMessage };
    cdsCommandCache.commandResults.set(cacheKey, testResult);
    return testResult;
  }
}

// src/cds/compiler/compile.ts
var import_child_process3 = require("child_process");
var import_path4 = require("path");

// src/cds/compiler/version.ts
var import_child_process2 = require("child_process");
var import_path3 = require("path");
function getCdsVersion(cdsCommand, cacheDir) {
  try {
    const spawnOptions = {
      shell: true,
      stdio: "pipe",
      env: { ...process.env }
    };
    if (cacheDir) {
      const nodePath = (0, import_path3.join)(cacheDir, "node_modules");
      spawnOptions.env = {
        ...process.env,
        NODE_PATH: `${nodePath}${import_path3.delimiter}${process.env.NODE_PATH ?? ""}`,
        PATH: `${(0, import_path3.join)(nodePath, ".bin")}${import_path3.delimiter}${process.env.PATH}`,
        npm_config_prefix: cacheDir
      };
    }
    const result = (0, import_child_process2.spawnSync)(`${cdsCommand} --version`, spawnOptions);
    if (result.status === 0 && result.stdout) {
      const versionOutput = result.stdout.toString().trim();
      const match2 = versionOutput.match(/@sap\/cds[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match2?.[1]) {
        return match2[1];
      }
      return versionOutput;
    }
    return void 0;
  } catch {
    return void 0;
  }
}

// src/cds/compiler/compile.ts
function parseCommandForSpawn(commandString) {
  const parts = commandString.trim().split(/\s+/);
  const executable = parts[0];
  const baseArgs = parts.slice(1);
  return { executable, baseArgs };
}
function determineCompilationTargets(project, sourceRoot2) {
  const projectAbsolutePath = (0, import_path4.join)(sourceRoot2, project.projectDir);
  const rootCdsFiles = project.cdsFiles.filter((file) => (0, import_path4.dirname)((0, import_path4.join)(sourceRoot2, file)) === projectAbsolutePath).map((file) => (0, import_path4.basename)(file));
  if (rootCdsFiles.includes("index.cds")) {
    return ["index.cds"];
  }
  const capDirectories = ["db", "srv", "app"];
  const existingCapDirs = capDirectories.filter((dir) => dirExists((0, import_path4.join)(projectAbsolutePath, dir)));
  if (existingCapDirs.length > 0) {
    return existingCapDirs;
  }
  if (rootCdsFiles.length > 0) {
    return rootCdsFiles;
  }
  return project.cdsFiles.map((file) => (0, import_path4.relative)(projectAbsolutePath, (0, import_path4.join)(sourceRoot2, file)));
}
function compileCdsToJson(cdsFilePath, sourceRoot2, cdsCommand, cacheDir, projectMap, projectDir) {
  try {
    const resolvedCdsFilePath = (0, import_path4.resolve)(cdsFilePath);
    if (!fileExists(resolvedCdsFilePath)) {
      throw new Error(`Expected CDS file '${resolvedCdsFilePath}' does not exist.`);
    }
    const cdsVersion = getCdsVersion(cdsCommand, cacheDir);
    const versionInfo = cdsVersion ? `with CDS v${cdsVersion}` : "";
    const projectBaseDir = (0, import_path4.join)(sourceRoot2, projectDir);
    const spawnOptions = createSpawnOptions(projectBaseDir, cdsCommand, cacheDir);
    if (!projectMap || !projectDir || !projectMap.has(projectDir)) {
      throw new Error(
        `Project directory '${projectDir}' not found in projectMap. Ensure the project is properly initialized.`
      );
    }
    const project = projectMap.get(projectDir);
    return compileProject(sourceRoot2, projectDir, cdsCommand, spawnOptions, versionInfo, project);
  } catch (error) {
    return { success: false, message: String(error) };
  }
}
function compileProject(sourceRoot2, projectDir, cdsCommand, spawnOptions, versionInfo, project) {
  cdsExtractorLog("info", `Compiling CDS project '${projectDir}' using ${versionInfo}...`);
  const compilationTargets = determineCompilationTargets(project, sourceRoot2);
  if (compilationTargets.length === 0) {
    throw new Error(
      `Project directory '${projectDir}' does not contain any CDS files and cannot be compiled`
    );
  }
  const projectJsonOutPath = (0, import_path4.join)(sourceRoot2, projectDir, modelCdsJsonFile);
  const compileArgs = [
    "compile",
    ...compilationTargets,
    "--to",
    "json",
    "--dest",
    modelCdsJsonFile,
    "--locations",
    "--log-level",
    "warn"
  ];
  cdsExtractorLog("info", `Compiling CDS project targets: ${compilationTargets.join(", ")}`);
  cdsExtractorLog(
    "info",
    `Running compilation task for CDS project '${projectDir}': command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`
  );
  const { executable, baseArgs } = parseCommandForSpawn(cdsCommand);
  const allArgs = [...baseArgs, ...compileArgs];
  const result = (0, import_child_process3.spawnSync)(executable, allArgs, spawnOptions);
  if (result.error) {
    cdsExtractorLog("error", `SpawnSync error: ${result.error.message}`);
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }
  if (result.stderr && result.stderr.length > 0) {
    cdsExtractorLog("warn", `CDS stderr output: ${result.stderr.toString()}`);
  }
  if (result.status !== 0) {
    cdsExtractorLog("error", `CDS command failed with status ${result.status}`);
    cdsExtractorLog(
      "error",
      `Command: ${cdsCommand} ${compileArgs.map((arg) => arg.includes(" ") ? `"${arg}"` : arg).join(" ")}`
    );
    cdsExtractorLog("error", `Stdout: ${result.stdout?.toString() || "No stdout"}`);
    cdsExtractorLog("error", `Stderr: ${result.stderr?.toString() || "No stderr"}`);
    throw new Error(
      `Could not compile the CAP project ${projectDir}.
Reported error(s):
\`\`\`
${result.stderr?.toString() || "Unknown error"}
\`\`\``
    );
  }
  if (!fileExists(projectJsonOutPath) && !dirExists(projectJsonOutPath)) {
    throw new Error(
      `CAP project '${projectDir}' was not compiled to JSON. This is likely because the project structure is invalid.`
    );
  }
  if (dirExists(projectJsonOutPath)) {
    cdsExtractorLog(
      "info",
      `CDS compiler generated JSON to output directory: ${projectJsonOutPath}`
    );
    recursivelyRenameJsonFiles(projectJsonOutPath);
  } else {
    cdsExtractorLog("info", `CDS compiler generated JSON to file: ${projectJsonOutPath}`);
  }
  normalizeLocationPathsInFile(projectJsonOutPath);
  return {
    success: true,
    outputPath: projectJsonOutPath,
    compiledAsProject: true,
    message: "Project was compiled using project-aware compilation"
  };
}
function createSpawnOptions(projectBaseDir, cdsCommand, cacheDir) {
  const spawnOptions = {
    cwd: projectBaseDir,
    // CRITICAL: Always use project base directory as cwd to ensure correct path generation
    shell: false,
    // Use shell=false to ensure proper argument handling for paths with spaces
    stdio: "pipe",
    env: { ...process.env }
  };
  const binPathNative = `node_modules${import_path4.sep}.bin${import_path4.sep}`;
  const binPathPosix = "node_modules/.bin/";
  const isDirectBinary = cdsCommand.includes(binPathNative) || cdsCommand.includes(binPathPosix);
  if (cacheDir && !isDirectBinary) {
    const nodePath = (0, import_path4.join)(cacheDir, "node_modules");
    spawnOptions.env = {
      ...process.env,
      NODE_PATH: `${nodePath}${import_path4.delimiter}${process.env.NODE_PATH ?? ""}`,
      PATH: `${(0, import_path4.join)(nodePath, ".bin")}${import_path4.delimiter}${process.env.PATH}`,
      // Add NPM configuration to ensure dependencies are resolved from the cache directory
      npm_config_prefix: cacheDir,
      // Ensure we don't pick up global CDS installations that might conflict
      npm_config_global: "false",
      // Clear any existing CDS environment variables that might interfere
      CDS_HOME: cacheDir
    };
  } else if (isDirectBinary) {
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_PATH;
    delete cleanEnv.npm_config_prefix;
    delete cleanEnv.npm_config_global;
    delete cleanEnv.CDS_HOME;
    spawnOptions.env = cleanEnv;
  }
  return spawnOptions;
}

// src/cds/compiler/validator.ts
var import_fs4 = require("fs");
var import_path5 = require("path");
function identifyTasksRequiringRetry(dependencyGraph2) {
  const tasksRequiringRetry = /* @__PURE__ */ new Map();
  for (const [projectDir, project] of dependencyGraph2.projects.entries()) {
    const failedTasks = [];
    for (const task of project.compilationTasks) {
      if (task.retryInfo?.hasBeenRetried) {
        continue;
      }
      const validationResult2 = validateTaskOutputs(task, dependencyGraph2.sourceRootDir);
      if (!validationResult2.isValid) {
        failedTasks.push(task);
        cdsExtractorLog(
          "info",
          `Task ${task.id} requires retry: ${validationResult2.validFileCount}/${validationResult2.expectedFileCount} output files valid (status: ${task.status})`
        );
        if (task.status === "success") {
          cdsExtractorLog(
            "warn",
            `Task ${task.id} was marked as successful but output files are missing or invalid - updating status to failed`
          );
          task.status = "failed";
        }
      }
    }
    if (failedTasks.length > 0) {
      tasksRequiringRetry.set(projectDir, failedTasks);
    }
  }
  if (tasksRequiringRetry.size > 0) {
    const totalFailedTasks = Array.from(tasksRequiringRetry.values()).reduce(
      (sum, tasks) => sum + tasks.length,
      0
    );
    cdsExtractorLog(
      "info",
      `Identified ${totalFailedTasks} task(s) requiring retry across ${tasksRequiringRetry.size} project(s)`
    );
  }
  return tasksRequiringRetry;
}
function updateCdsDependencyGraphStatus(dependencyGraph2, sourceRootDir) {
  let successfulTasks = 0;
  let failedTasks = 0;
  let tasksSuccessfullyRetried = 0;
  for (const project of dependencyGraph2.projects.values()) {
    for (const task of project.compilationTasks) {
      const validationResult2 = validateTaskOutputs(task, sourceRootDir);
      const isValid = validationResult2.isValid;
      if (isValid) {
        task.status = "success";
        successfulTasks++;
        if (task.retryInfo?.hasBeenRetried) {
          tasksSuccessfullyRetried++;
        }
      } else {
        task.status = "failed";
        failedTasks++;
      }
    }
  }
  dependencyGraph2.statusSummary.successfulCompilations = successfulTasks;
  dependencyGraph2.statusSummary.failedCompilations = failedTasks;
  dependencyGraph2.retryStatus.totalTasksSuccessfullyRetried = tasksSuccessfullyRetried;
  dependencyGraph2.retryStatus.totalTasksRequiringRetry = failedTasks;
  return {
    tasksValidated: successfulTasks + failedTasks,
    successfulTasks,
    failedTasks,
    tasksSuccessfullyRetried
  };
}
function validateOutputFile(filePath) {
  const result = {
    isValid: false,
    filePath,
    exists: false
  };
  if (!fileExists(filePath)) {
    result.error = "File does not exist";
    return result;
  }
  result.exists = true;
  if (filePath.endsWith(".cds.json") || filePath.endsWith(".json")) {
    try {
      const content = (0, import_fs4.readFileSync)(filePath, "utf8");
      if (!content.trim()) {
        result.error = "File is empty";
        return result;
      }
      const parsed = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null) {
        result.error = "File does not contain a valid JSON object";
        return result;
      }
      result.hasValidJson = true;
      result.isValid = true;
    } catch (error) {
      result.error = `Invalid JSON content: ${String(error)}`;
      return result;
    }
  } else {
    result.isValid = true;
  }
  return result;
}
function validateTaskOutputs(task, sourceRoot2) {
  const fileResults = [];
  const expectedOutput = task.expectedOutputFile;
  const absolutePath = (0, import_path5.isAbsolute)(expectedOutput) ? expectedOutput : (0, import_path5.join)(sourceRoot2, expectedOutput);
  const fileResult = validateOutputFile(absolutePath);
  fileResults.push(fileResult);
  const validFileCount = fileResults.filter((r) => r.isValid).length;
  const expectedFileCount = 1;
  const isValid = validFileCount === expectedFileCount && expectedFileCount > 0;
  return {
    isValid,
    task,
    fileResults,
    validFileCount,
    expectedFileCount
  };
}

// src/diagnostics.ts
var import_child_process4 = require("child_process");
var import_path6 = require("path");
function convertToRelativePath(filePath, sourceRoot2) {
  if (!filePath || typeof filePath !== "string" || !sourceRoot2 || typeof sourceRoot2 !== "string") {
    return ".";
  }
  try {
    const resolvedSourceRoot = (0, import_path6.resolve)(sourceRoot2);
    const resolvedFilePath = (0, import_path6.isAbsolute)(filePath) ? (0, import_path6.resolve)(filePath) : (0, import_path6.resolve)(resolvedSourceRoot, filePath);
    if (resolvedFilePath === resolvedSourceRoot) {
      return ".";
    }
    const relativePath = (0, import_path6.relative)(resolvedSourceRoot, resolvedFilePath);
    if (relativePath.startsWith("..")) {
      return ".";
    }
    return relativePath;
  } catch {
    return ".";
  }
}
function addDiagnostic(filePath, message, codeqlExePath2, sourceId, sourceName, severity, logPrefix, sourceRoot2) {
  const finalFilePath = sourceRoot2 ? convertToRelativePath(filePath, sourceRoot2) : (0, import_path6.resolve)(filePath);
  let finalMessage = message;
  if (sourceRoot2 && finalFilePath === "." && filePath !== sourceRoot2) {
    const resolvedSourceRoot = (0, import_path6.resolve)(sourceRoot2);
    const resolvedFilePath = (0, import_path6.isAbsolute)(filePath) ? (0, import_path6.resolve)(filePath) : (0, import_path6.resolve)(resolvedSourceRoot, filePath);
    if (resolvedFilePath !== resolvedSourceRoot) {
      finalMessage = `${message}

**Note**: The file \`${filePath}\` is located outside the scanned source directory and cannot be linked directly in this diagnostic. This diagnostic is associated with the repository root instead.`;
    }
  }
  try {
    (0, import_child_process4.execFileSync)(codeqlExePath2, [
      "database",
      "add-diagnostic",
      "--extractor-name=cds",
      "--ready-for-status-page",
      `--source-id=${sourceId}`,
      `--source-name=${sourceName}`,
      `--severity=${severity}`,
      `--markdown-message=${finalMessage}`,
      `--file-path=${finalFilePath}`,
      "--",
      `${process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE ?? ""}`
    ]);
    cdsExtractorLog("info", `Added ${severity} diagnostic for ${logPrefix}: ${filePath}`);
    return true;
  } catch (err) {
    cdsExtractorLog(
      "error",
      `Failed to add ${severity} diagnostic for ${logPrefix}=${filePath} : ${String(err)}`
    );
    return false;
  }
}
function addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath2, sourceRoot2) {
  return addDiagnostic(
    cdsFilePath,
    errorMessage,
    codeqlExePath2,
    "cds/compilation-failure",
    "Failure to compile one or more SAP CAP CDS files",
    "error" /* Error */,
    "source file",
    sourceRoot2
  );
}
function addDependencyGraphDiagnostic(sourceRoot2, errorMessage, codeqlExePath2) {
  return addDiagnostic(
    sourceRoot2,
    errorMessage,
    codeqlExePath2,
    "cds/dependency-graph-failure",
    "CDS project dependency graph build failure",
    "error" /* Error */,
    "source root",
    sourceRoot2
  );
}
function addDependencyInstallationDiagnostic(sourceRoot2, errorMessage, codeqlExePath2) {
  return addDiagnostic(
    sourceRoot2,
    errorMessage,
    codeqlExePath2,
    "cds/dependency-installation-failure",
    "CDS dependency installation failure",
    "error" /* Error */,
    "source root",
    sourceRoot2
  );
}
function addEnvironmentSetupDiagnostic(sourceRoot2, errorMessage, codeqlExePath2) {
  const contextFile = sourceRoot2;
  return addDiagnostic(
    contextFile,
    errorMessage,
    codeqlExePath2,
    "cds/environment-setup-failure",
    "CDS extractor environment setup failure",
    "error" /* Error */,
    "source root",
    sourceRoot2
  );
}
function addJavaScriptExtractorDiagnostic(filePath, errorMessage, codeqlExePath2, sourceRoot2) {
  return addDiagnostic(
    filePath,
    errorMessage,
    codeqlExePath2,
    "cds/js-extractor-failure",
    "Failure in JavaScript extractor for SAP CAP CDS files",
    "error" /* Error */,
    "extraction file",
    sourceRoot2
  );
}
function addNoCdsProjectsDiagnostic(sourceRoot2, message, codeqlExePath2) {
  return addDiagnostic(
    sourceRoot2,
    message,
    codeqlExePath2,
    "cds/no-cds-projects",
    "No CDS projects detected in source",
    "warning" /* Warning */,
    "source root",
    sourceRoot2
  );
}

// src/packageManager/cacheInstaller.ts
var import_child_process6 = require("child_process");
var import_crypto = require("crypto");
var import_fs5 = require("fs");
var import_path7 = require("path");

// src/packageManager/versionResolver.ts
var import_child_process5 = require("child_process");
var availableVersionsCache = /* @__PURE__ */ new Map();
var cacheStats = {
  hits: 0,
  misses: 0,
  get hitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(1) : "0.0";
  }
};
function checkVersionCompatibility(cdsVersion, cdsDkVersion) {
  if (cdsVersion === "latest" || cdsDkVersion === "latest") {
    return { isCompatible: true };
  }
  const parsedCds = parseSemanticVersion(cdsVersion);
  const parsedCdsDk = parseSemanticVersion(cdsDkVersion);
  if (!parsedCds || !parsedCdsDk) {
    return {
      isCompatible: false,
      warning: "Unable to parse version numbers for compatibility check"
    };
  }
  const majorVersionsMatch = parsedCds.major === parsedCdsDk.major;
  const minorVersionsMatch = parsedCds.minor === parsedCdsDk.minor;
  if (!majorVersionsMatch) {
    return {
      isCompatible: false,
      warning: `Major version mismatch: @sap/cds ${cdsVersion} and @sap/cds-dk ${cdsDkVersion} may not be compatible`
    };
  }
  if (!minorVersionsMatch) {
    return {
      isCompatible: true,
      warning: `Minor version difference: @sap/cds ${cdsVersion} and @sap/cds-dk ${cdsDkVersion} - consider aligning versions for best compatibility`
    };
  }
  return { isCompatible: true };
}
function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }
  return 0;
}
function findBestAvailableVersion(availableVersions, requiredVersion) {
  const parsedVersions = availableVersions.map((v) => parseSemanticVersion(v)).filter((v) => v !== null);
  if (parsedVersions.length === 0) {
    return null;
  }
  const satisfyingVersions = parsedVersions.filter((v) => satisfiesRange(v, requiredVersion));
  if (satisfyingVersions.length > 0) {
    satisfyingVersions.sort((a, b) => compareVersions(b, a));
    return satisfyingVersions[0].original;
  }
  parsedVersions.sort((a, b) => compareVersions(b, a));
  return parsedVersions[0].original;
}
function getAvailableVersions(packageName) {
  if (availableVersionsCache.has(packageName)) {
    cacheStats.hits++;
    return availableVersionsCache.get(packageName);
  }
  cacheStats.misses++;
  try {
    const output = (0, import_child_process5.execSync)(`npm view ${packageName} versions --json`, {
      encoding: "utf8",
      timeout: 3e4
      // 30 second timeout
    });
    const versions = JSON.parse(output);
    let versionArray = [];
    if (Array.isArray(versions)) {
      versionArray = versions.filter((v) => typeof v === "string");
    } else if (typeof versions === "string") {
      versionArray = [versions];
    }
    availableVersionsCache.set(packageName, versionArray);
    return versionArray;
  } catch (error) {
    cdsExtractorLog("warn", `Failed to fetch versions for ${packageName}: ${String(error)}`);
    availableVersionsCache.set(packageName, []);
    return [];
  }
}
function parseSemanticVersion(version) {
  if (version === "latest") {
    return {
      major: 999,
      minor: 999,
      patch: 999,
      original: version
    };
  }
  const cleanVersion = version.replace(/^[\^~>=<]+/, "");
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  const match2 = cleanVersion.match(semverRegex);
  if (!match2) {
    return null;
  }
  return {
    major: parseInt(match2[1], 10),
    minor: parseInt(match2[2], 10),
    patch: parseInt(match2[3], 10),
    prerelease: match2[4],
    build: match2[5],
    original: version
  };
}
function isSatisfyingVersion(resolvedVersion, requestedVersion) {
  if (resolvedVersion === requestedVersion || requestedVersion === "latest") {
    return true;
  }
  const parsedResolved = parseSemanticVersion(resolvedVersion);
  if (!parsedResolved) {
    return false;
  }
  return satisfiesRange(parsedResolved, requestedVersion);
}
function resolveCdsVersions2(cdsVersion, cdsDkVersion) {
  const cdsVersions = getAvailableVersions("@sap/cds");
  const cdsDkVersions = getAvailableVersions("@sap/cds-dk");
  const resolvedCdsVersion = findBestAvailableVersion(cdsVersions, cdsVersion);
  const resolvedCdsDkVersion = findBestAvailableVersion(cdsDkVersions, cdsDkVersion);
  const cdsExactMatch = resolvedCdsVersion === cdsVersion || cdsVersion === "latest" && resolvedCdsVersion !== null;
  const cdsDkExactMatch = resolvedCdsDkVersion === cdsDkVersion || cdsDkVersion === "latest" && resolvedCdsDkVersion !== null;
  const cdsSatisfiesRange = resolvedCdsVersion ? isSatisfyingVersion(resolvedCdsVersion, cdsVersion) : false;
  const cdsDkSatisfiesRange = resolvedCdsDkVersion ? isSatisfyingVersion(resolvedCdsDkVersion, cdsDkVersion) : false;
  const isFallback = !cdsSatisfiesRange || !cdsDkSatisfiesRange;
  let warning;
  if (resolvedCdsVersion && resolvedCdsDkVersion) {
    const compatibility = checkVersionCompatibility(resolvedCdsVersion, resolvedCdsDkVersion);
    const shouldShowWarning = isFallback || !cdsExactMatch || !cdsDkExactMatch || compatibility.warning && !compatibility.isCompatible;
    if (compatibility.warning && shouldShowWarning) {
      warning = compatibility.warning;
    }
  }
  return {
    resolvedCdsVersion,
    resolvedCdsDkVersion,
    cdsExactMatch,
    cdsDkExactMatch,
    warning,
    isFallback
  };
}
function satisfiesRange(version, range2) {
  if (range2 === "latest") {
    return true;
  }
  const rangeVersion = parseSemanticVersion(range2);
  if (!rangeVersion) {
    return false;
  }
  if (range2.startsWith("^")) {
    return version.major === rangeVersion.major && compareVersions(version, rangeVersion) >= 0;
  } else if (range2.startsWith("~")) {
    return version.major === rangeVersion.major && version.minor === rangeVersion.minor && compareVersions(version, rangeVersion) >= 0;
  } else if (range2.startsWith(">=")) {
    return compareVersions(version, rangeVersion) >= 0;
  } else if (range2.startsWith(">")) {
    return compareVersions(version, rangeVersion) > 0;
  } else if (range2.startsWith("<=")) {
    return compareVersions(version, rangeVersion) <= 0;
  } else if (range2.startsWith("<")) {
    return compareVersions(version, rangeVersion) < 0;
  } else {
    return compareVersions(version, rangeVersion) === 0;
  }
}

// src/packageManager/cacheInstaller.ts
var cacheSubDirName = ".cds-extractor-cache";
function addDependencyVersionWarning(packageJsonPath, warningMessage, codeqlExePath2) {
  try {
    (0, import_child_process6.execFileSync)(codeqlExePath2, [
      "database",
      "add-diagnostic",
      "--extractor-name=cds",
      "--ready-for-status-page",
      "--source-id=cds/dependency-version-fallback",
      "--source-name=Using fallback versions for SAP CAP CDS dependencies",
      `--severity=${"warning" /* Warning */}`,
      `--markdown-message=${warningMessage}`,
      `--file-path=${(0, import_path7.resolve)(packageJsonPath)}`,
      "--",
      `${process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE ?? ""}`
    ]);
    cdsExtractorLog("info", `Added warning diagnostic for dependency fallback: ${packageJsonPath}`);
    return true;
  } catch (err) {
    cdsExtractorLog(
      "error",
      `Failed to add warning diagnostic for ${packageJsonPath}: ${String(err)}`
    );
    return false;
  }
}
function cacheInstallDependencies(dependencyGraph2, sourceRoot2, codeqlExePath2) {
  if (dependencyGraph2.projects.size === 0) {
    cdsExtractorLog("info", "No CDS projects found for dependency installation.");
    cdsExtractorLog(
      "info",
      "This is expected if the source contains no CAP/CDS projects and should be handled by the caller."
    );
    return /* @__PURE__ */ new Map();
  }
  const dependencyCombinations = extractUniqueDependencyCombinations(dependencyGraph2.projects);
  if (dependencyCombinations.length === 0) {
    cdsExtractorLog(
      "error",
      "No CDS dependencies found in any project. This means projects were detected but lack proper @sap/cds dependencies."
    );
    cdsExtractorLog(
      "info",
      "Will attempt to use system-installed CDS tools if available, but compilation may fail."
    );
    return /* @__PURE__ */ new Map();
  }
  cdsExtractorLog(
    "info",
    `Found ${dependencyCombinations.length} unique CDS dependency combination(s).`
  );
  for (const combination of dependencyCombinations) {
    const { cdsVersion, cdsDkVersion, hash, resolvedCdsVersion, resolvedCdsDkVersion, isFallback } = combination;
    const actualCdsVersion = resolvedCdsVersion ?? cdsVersion;
    const actualCdsDkVersion = resolvedCdsDkVersion ?? cdsDkVersion;
    const fallbackNote = isFallback ? " (using fallback versions)" : "";
    cdsExtractorLog(
      "info",
      `Dependency combination ${hash.substring(0, 8)}: @sap/cds@${actualCdsVersion}, @sap/cds-dk@${actualCdsDkVersion}${fallbackNote}`
    );
  }
  const cacheRootDir = (0, import_path7.join)(sourceRoot2, cacheSubDirName);
  cdsExtractorLog(
    "info",
    `Using cache directory '${cacheSubDirName}' within source root directory '${cacheRootDir}'`
  );
  if (!(0, import_fs5.existsSync)(cacheRootDir)) {
    try {
      (0, import_fs5.mkdirSync)(cacheRootDir, { recursive: true });
      cdsExtractorLog("info", `Created cache directory: ${cacheRootDir}`);
    } catch (err) {
      cdsExtractorLog(
        "warn",
        `Failed to create cache directory: ${err instanceof Error ? err.message : String(err)}`
      );
      cdsExtractorLog("info", "Skipping dependency installation due to cache directory failure.");
      return /* @__PURE__ */ new Map();
    }
  } else {
    cdsExtractorLog("info", `Cache directory already exists: ${cacheRootDir}`);
  }
  const projectCacheDirMap2 = /* @__PURE__ */ new Map();
  let successfulInstallations = 0;
  for (const combination of dependencyCombinations) {
    const { cdsVersion, cdsDkVersion, hash } = combination;
    const { resolvedCdsVersion, resolvedCdsDkVersion } = combination;
    const cacheDirName = `cds-${hash}`;
    const cacheDir = (0, import_path7.join)(cacheRootDir, cacheDirName);
    cdsExtractorLog(
      "info",
      `Processing dependency combination ${hash.substring(0, 8)} in cache directory: ${cacheDirName}`
    );
    if (!(0, import_fs5.existsSync)(cacheDir)) {
      try {
        (0, import_fs5.mkdirSync)(cacheDir, { recursive: true });
        cdsExtractorLog("info", `Created cache subdirectory: ${cacheDirName}`);
      } catch (err) {
        cdsExtractorLog(
          "error",
          `Failed to create cache directory for combination ${hash.substring(0, 8)} (${cacheDirName}): ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }
      const actualCdsVersion = resolvedCdsVersion ?? cdsVersion;
      const actualCdsDkVersion = resolvedCdsDkVersion ?? cdsDkVersion;
      const packageJson = {
        name: `cds-extractor-cache-${hash}`,
        version: "1.0.0",
        private: true,
        dependencies: {
          "@sap/cds": actualCdsVersion,
          "@sap/cds-dk": actualCdsDkVersion
        }
      };
      try {
        (0, import_fs5.writeFileSync)((0, import_path7.join)(cacheDir, "package.json"), JSON.stringify(packageJson, null, 2));
        cdsExtractorLog("info", `Created package.json in cache subdirectory: ${cacheDirName}`);
      } catch (err) {
        cdsExtractorLog(
          "error",
          `Failed to create package.json in cache directory ${cacheDirName}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }
    }
    const samplePackageJsonPath = Array.from(dependencyGraph2.projects.values()).find(
      (project) => project.packageJson
    )?.projectDir;
    const packageJsonPath = samplePackageJsonPath ? (0, import_path7.join)(sourceRoot2, samplePackageJsonPath, "package.json") : void 0;
    const installSuccess = installDependenciesInCache(
      cacheDir,
      combination,
      cacheDirName,
      packageJsonPath,
      codeqlExePath2
    );
    if (!installSuccess) {
      cdsExtractorLog(
        "warn",
        `Skipping failed dependency combination ${hash.substring(0, 8)} (cache directory: ${cacheDirName})`
      );
      continue;
    }
    successfulInstallations++;
    for (const [projectDir, project] of Array.from(dependencyGraph2.projects.entries())) {
      if (!project.packageJson) {
        continue;
      }
      const p_cdsVersion = project.packageJson.dependencies?.["@sap/cds"] ?? "latest";
      const p_cdsDkVersion = project.packageJson.devDependencies?.["@sap/cds-dk"] ?? p_cdsVersion;
      const projectResolvedVersions = resolveCdsVersions2(p_cdsVersion, p_cdsDkVersion);
      const projectActualCdsVersion = projectResolvedVersions.resolvedCdsVersion ?? p_cdsVersion;
      const projectActualCdsDkVersion = projectResolvedVersions.resolvedCdsDkVersion ?? p_cdsDkVersion;
      const combinationActualCdsVersion = combination.resolvedCdsVersion ?? combination.cdsVersion;
      const combinationActualCdsDkVersion = combination.resolvedCdsDkVersion ?? combination.cdsDkVersion;
      if (projectActualCdsVersion === combinationActualCdsVersion && projectActualCdsDkVersion === combinationActualCdsDkVersion) {
        projectCacheDirMap2.set(projectDir, cacheDir);
      }
    }
  }
  if (successfulInstallations === 0) {
    cdsExtractorLog("error", "Failed to install any dependency combinations.");
    if (dependencyCombinations.length > 0) {
      cdsExtractorLog(
        "error",
        `All ${dependencyCombinations.length} dependency combination(s) failed to install. This will likely cause compilation failures.`
      );
    }
  } else if (successfulInstallations < dependencyCombinations.length) {
    cdsExtractorLog(
      "warn",
      `Successfully installed ${successfulInstallations} out of ${dependencyCombinations.length} dependency combinations.`
    );
  } else {
    cdsExtractorLog("info", "All dependency combinations installed successfully.");
  }
  if (projectCacheDirMap2.size > 0) {
    cdsExtractorLog("info", `Project to cache directory mappings:`);
    for (const [projectDir, cacheDir] of Array.from(projectCacheDirMap2.entries())) {
      const cacheDirName = (0, import_path7.join)(cacheDir).split("/").pop() ?? "unknown";
      cdsExtractorLog("info", `  ${projectDir} \u2192 ${cacheDirName}`);
    }
  } else {
    cdsExtractorLog(
      "warn",
      "No project to cache directory mappings created. Projects may not have compatible dependencies installed."
    );
  }
  return projectCacheDirMap2;
}
function extractUniqueDependencyCombinations(projects) {
  const combinations = /* @__PURE__ */ new Map();
  for (const project of Array.from(projects.values())) {
    if (!project.packageJson) {
      continue;
    }
    const cdsVersion = project.packageJson.dependencies?.["@sap/cds"] ?? "latest";
    const cdsDkVersion = project.packageJson.devDependencies?.["@sap/cds-dk"] ?? cdsVersion;
    cdsExtractorLog(
      "info",
      `Resolving available dependency versions for project '${project.projectDir}' with dependencies: [@sap/cds@${cdsVersion}, @sap/cds-dk@${cdsDkVersion}]`
    );
    const resolvedVersions = resolveCdsVersions2(cdsVersion, cdsDkVersion);
    const { resolvedCdsVersion, resolvedCdsDkVersion, ...rest } = resolvedVersions;
    if (resolvedCdsVersion && resolvedCdsDkVersion) {
      let statusMsg;
      if (resolvedVersions.cdsExactMatch && resolvedVersions.cdsDkExactMatch) {
        statusMsg = " (exact match)";
      } else if (!resolvedVersions.isFallback) {
        statusMsg = " (compatible versions)";
      } else {
        statusMsg = " (using fallback versions)";
      }
      cdsExtractorLog(
        "info",
        `Resolved to: @sap/cds@${resolvedCdsVersion}, @sap/cds-dk@${resolvedCdsDkVersion}${statusMsg}`
      );
    } else {
      cdsExtractorLog(
        "error",
        `Failed to resolve CDS dependencies: @sap/cds@${cdsVersion}, @sap/cds-dk@${cdsDkVersion}`
      );
    }
    const actualCdsVersion = resolvedCdsVersion ?? cdsVersion;
    const actualCdsDkVersion = resolvedCdsDkVersion ?? cdsDkVersion;
    const hash = (0, import_crypto.createHash)("sha256").update(`${actualCdsVersion}|${actualCdsDkVersion}`).digest("hex");
    if (!combinations.has(hash)) {
      combinations.set(hash, {
        cdsVersion,
        cdsDkVersion,
        hash,
        resolvedCdsVersion: resolvedCdsVersion ?? void 0,
        resolvedCdsDkVersion: resolvedCdsDkVersion ?? void 0,
        ...rest
      });
    }
  }
  return Array.from(combinations.values());
}
function installDependenciesInCache(cacheDir, combination, cacheDirName, packageJsonPath, codeqlExePath2) {
  const { resolvedCdsVersion, resolvedCdsDkVersion, isFallback, warning } = combination;
  const nodeModulesExists = (0, import_fs5.existsSync)((0, import_path7.join)(cacheDir, "node_modules", "@sap", "cds")) && (0, import_fs5.existsSync)((0, import_path7.join)(cacheDir, "node_modules", "@sap", "cds-dk"));
  if (nodeModulesExists) {
    cdsExtractorLog(
      "info",
      `Using cached dependencies for @sap/cds@${resolvedCdsVersion} and @sap/cds-dk@${resolvedCdsDkVersion} from ${cacheDirName}`
    );
    if (isFallback && warning && packageJsonPath && codeqlExePath2) {
      addDependencyVersionWarning(packageJsonPath, warning, codeqlExePath2);
    }
    return true;
  }
  if (!resolvedCdsVersion || !resolvedCdsDkVersion) {
    cdsExtractorLog("error", "Cannot install dependencies: no compatible versions found");
    return false;
  }
  cdsExtractorLog(
    "info",
    `Installing @sap/cds@${resolvedCdsVersion} and @sap/cds-dk@${resolvedCdsDkVersion} in cache directory: ${cacheDirName}`
  );
  if (isFallback && warning) {
    cdsExtractorLog("warn", warning);
  }
  try {
    (0, import_child_process6.execFileSync)("npm", ["install", "--quiet", "--no-audit", "--no-fund"], {
      cwd: cacheDir,
      stdio: "inherit"
    });
    if (isFallback && warning && packageJsonPath && codeqlExePath2) {
      addDependencyVersionWarning(packageJsonPath, warning, codeqlExePath2);
    }
    return true;
  } catch (err) {
    const errorMessage = `Failed to install resolved dependencies in cache directory ${cacheDir}: ${err instanceof Error ? err.message : String(err)}`;
    cdsExtractorLog("error", errorMessage);
    return false;
  }
}

// src/packageManager/projectInstaller.ts
var import_child_process7 = require("child_process");
var import_path8 = require("path");
function needsFullDependencyInstallation(project) {
  if (project.retryStatus?.fullDependenciesInstalled) {
    return false;
  }
  const hasFailedTasks = project.compilationTasks.some(
    (task) => task.status === "failed" && !task.retryInfo?.hasBeenRetried
  );
  return hasFailedTasks && project.packageJson !== void 0;
}
function projectInstallDependencies(project, sourceRoot2) {
  const startTime = Date.now();
  const projectPath = (0, import_path8.join)(sourceRoot2, project.projectDir);
  const result = {
    success: false,
    projectDir: projectPath,
    warnings: [],
    durationMs: 0,
    timedOut: false
  };
  try {
    if (!project.packageJson) {
      result.error = "No package.json found for project";
      return result;
    }
    cdsExtractorLog(
      "info",
      `Installing full dependencies for project ${project.projectDir} in project's node_modules`
    );
    try {
      (0, import_child_process7.execFileSync)("npm", ["install", "--quiet", "--no-audit", "--no-fund"], {
        cwd: projectPath,
        stdio: "inherit",
        timeout: 12e4
        // 2-minute timeout
      });
      result.success = true;
      cdsExtractorLog(
        "info",
        `Successfully installed full dependencies for project ${project.projectDir}`
      );
    } catch (execError) {
      if (execError instanceof Error && "signal" in execError && execError.signal === "SIGTERM") {
        result.timedOut = true;
        result.error = "Dependency installation timed out";
      } else {
        result.error = `npm install failed: ${String(execError)}`;
      }
      result.warnings.push(
        `Dependency installation failed but will still attempt retry compilation: ${result.error}`
      );
      cdsExtractorLog("warn", result.warnings[0]);
    }
  } catch (error) {
    result.error = `Failed to install full dependencies: ${String(error)}`;
    cdsExtractorLog("error", result.error);
  } finally {
    result.durationMs = Date.now() - startTime;
  }
  return result;
}

// src/cds/compiler/retry.ts
function addCompilationDiagnosticsForFailedTasks(dependencyGraph2, codeqlExePath2, sourceRoot2) {
  for (const project of dependencyGraph2.projects.values()) {
    for (const task of project.compilationTasks) {
      if (task.status === "failed") {
        const shouldAddDiagnostic = task.retryInfo?.hasBeenRetried ?? !task.retryInfo;
        if (shouldAddDiagnostic) {
          for (const sourceFile of task.sourceFiles) {
            addCompilationDiagnostic(
              sourceFile,
              task.errorSummary ?? "Compilation failed",
              codeqlExePath2,
              sourceRoot2
            );
          }
        }
      }
    }
  }
}
function orchestrateRetryAttempts(dependencyGraph2, codeqlExePath2) {
  const startTime = Date.now();
  let dependencyInstallationStartTime = 0;
  let dependencyInstallationEndTime = 0;
  let retryCompilationStartTime = 0;
  let retryCompilationEndTime = 0;
  const result = {
    success: true,
    projectsWithRetries: [],
    totalTasksRequiringRetry: 0,
    totalSuccessfulRetries: 0,
    totalFailedRetries: 0,
    projectsWithSuccessfulDependencyInstallation: [],
    projectsWithFailedDependencyInstallation: [],
    retryDurationMs: 0,
    dependencyInstallationDurationMs: 0,
    retryCompilationDurationMs: 0
  };
  try {
    cdsExtractorLog("info", "Identifying tasks requiring retry...");
    const tasksRequiringRetry = identifyTasksRequiringRetry(dependencyGraph2);
    if (tasksRequiringRetry.size === 0) {
      cdsExtractorLog("info", "No tasks require retry - all compilations successful");
      return result;
    }
    result.totalTasksRequiringRetry = Array.from(tasksRequiringRetry.values()).reduce(
      (sum, tasks) => sum + tasks.length,
      0
    );
    dependencyGraph2.retryStatus.totalTasksRequiringRetry = result.totalTasksRequiringRetry;
    dependencyInstallationStartTime = Date.now();
    for (const [projectDir, failedTasks] of tasksRequiringRetry) {
      const project = dependencyGraph2.projects.get(projectDir);
      if (!project) {
        continue;
      }
      if (needsFullDependencyInstallation(project)) {
        try {
          const installResult = projectInstallDependencies(project, dependencyGraph2.sourceRootDir);
          project.retryStatus ??= {
            fullDependenciesInstalled: false,
            tasksRequiringRetry: failedTasks.length,
            tasksRetried: 0,
            installationErrors: []
          };
          if (installResult.success) {
            project.retryStatus.fullDependenciesInstalled = true;
            result.projectsWithSuccessfulDependencyInstallation.push(projectDir);
            dependencyGraph2.retryStatus.projectsWithFullDependencies.add(projectDir);
          } else {
            project.retryStatus.installationErrors = [
              ...project.retryStatus.installationErrors ?? [],
              installResult.error ?? "Unknown installation error"
            ];
            result.projectsWithFailedDependencyInstallation.push(projectDir);
          }
          if (installResult.warnings.length > 0) {
            for (const warning of installResult.warnings) {
              dependencyGraph2.errors.warnings.push({
                phase: "retry_dependency_installation",
                message: warning,
                timestamp: /* @__PURE__ */ new Date(),
                context: projectDir
              });
            }
          }
        } catch (error) {
          const errorMessage = `Failed to install full dependencies for project ${projectDir}: ${String(error)}`;
          cdsExtractorLog("error", errorMessage);
          dependencyGraph2.errors.critical.push({
            phase: "retry_dependency_installation",
            message: errorMessage,
            timestamp: /* @__PURE__ */ new Date()
          });
          result.projectsWithFailedDependencyInstallation.push(projectDir);
        }
      }
      dependencyGraph2.retryStatus.projectsRequiringFullDependencies.add(projectDir);
    }
    dependencyInstallationEndTime = Date.now();
    result.dependencyInstallationDurationMs = dependencyInstallationEndTime - dependencyInstallationStartTime;
    cdsExtractorLog("info", "Executing retry compilation attempts...");
    retryCompilationStartTime = Date.now();
    for (const [projectDir, failedTasks] of tasksRequiringRetry) {
      const project = dependencyGraph2.projects.get(projectDir);
      if (!project) {
        continue;
      }
      const retryExecutionResult = retryCompilationTasksForProject(
        failedTasks,
        project,
        dependencyGraph2
      );
      result.projectsWithRetries.push(projectDir);
      result.totalSuccessfulRetries += retryExecutionResult.successfulRetries;
      result.totalFailedRetries += retryExecutionResult.failedRetries;
      if (project.retryStatus) {
        project.retryStatus.tasksRetried = retryExecutionResult.retriedTasks.length;
      }
    }
    retryCompilationEndTime = Date.now();
    result.retryCompilationDurationMs = retryCompilationEndTime - retryCompilationStartTime;
    updateCdsDependencyGraphStatus(dependencyGraph2, dependencyGraph2.sourceRootDir);
    updateDependencyGraphWithRetryResults(dependencyGraph2, result);
    addCompilationDiagnosticsForFailedTasks(
      dependencyGraph2,
      codeqlExePath2,
      dependencyGraph2.sourceRootDir
    );
    result.success = result.totalSuccessfulRetries > 0 || result.totalTasksRequiringRetry === 0;
  } catch (error) {
    const errorMessage = `Retry orchestration failed: ${String(error)}`;
    cdsExtractorLog("error", errorMessage);
    dependencyGraph2.errors.critical.push({
      phase: "retry_orchestration",
      message: errorMessage,
      timestamp: /* @__PURE__ */ new Date()
    });
    result.success = false;
  } finally {
    result.retryDurationMs = Date.now() - startTime;
  }
  return result;
}
function retryCompilationTask(task, retryCommand, projectDir, dependencyGraph2) {
  const startTime = /* @__PURE__ */ new Date();
  const attemptId = `${task.id}_retry_${startTime.getTime()}`;
  const cdsCommandString = retryCommand.originalCommand;
  const attempt = {
    id: attemptId,
    cdsCommand: cdsCommandString,
    cacheDir: projectDir,
    timestamp: startTime,
    result: {
      success: false,
      timestamp: startTime
    }
  };
  try {
    const primarySourceFile = task.sourceFiles[0];
    const compilationResult = compileCdsToJson(
      primarySourceFile,
      dependencyGraph2.sourceRootDir,
      cdsCommandString,
      projectDir,
      // Convert CDS projects to BasicCdsProject format expected by compileCdsToJson
      new Map(
        Array.from(dependencyGraph2.projects.entries()).map(([key, value]) => [
          key,
          {
            cdsFiles: value.cdsFiles,
            compilationTargets: value.compilationTargets,
            expectedOutputFile: value.expectedOutputFile,
            projectDir: value.projectDir,
            dependencies: value.dependencies,
            imports: value.imports,
            packageJson: value.packageJson
          }
        ])
      ),
      task.projectDir
    );
    attempt.result = {
      ...compilationResult,
      timestamp: startTime
    };
  } catch (error) {
    attempt.error = {
      message: String(error),
      stack: error instanceof Error ? error.stack : void 0
    };
  }
  return attempt;
}
function retryCompilationTasksForProject(tasksToRetry, project, dependencyGraph2) {
  const startTime = Date.now();
  const result = {
    projectDir: project.projectDir,
    retriedTasks: [],
    successfulRetries: 0,
    failedRetries: 0,
    fullDependenciesAvailable: Boolean(project.retryStatus?.fullDependenciesInstalled),
    executionDurationMs: 0,
    retryErrors: []
  };
  cdsExtractorLog(
    "info",
    `Retrying ${tasksToRetry.length} task(s) for project ${project.projectDir} using ${result.fullDependenciesAvailable ? "full" : "minimal"} dependencies`
  );
  for (const task of tasksToRetry) {
    try {
      task.retryInfo = {
        hasBeenRetried: true,
        retryReason: "Output validation failed",
        fullDependenciesInstalled: result.fullDependenciesAvailable,
        retryTimestamp: /* @__PURE__ */ new Date()
      };
      const retryAttempt = retryCompilationTask(
        task,
        task.retryCommand,
        project.projectDir,
        dependencyGraph2
      );
      task.retryInfo.retryAttempt = retryAttempt;
      task.attempts.push(retryAttempt);
      result.retriedTasks.push(task);
      if (retryAttempt.result.success) {
        task.status = "success";
        result.successfulRetries++;
        cdsExtractorLog("info", `Retry successful for task ${task.id}`);
      } else {
        task.status = "failed";
        task.errorSummary = retryAttempt.error?.message ?? "Retry compilation failed";
        result.failedRetries++;
        result.retryErrors.push(task.errorSummary);
        cdsExtractorLog("warn", `Retry failed for task ${task.id}: ${task.errorSummary}`);
      }
    } catch (error) {
      const errorMessage = `Failed to retry task ${task.id}: ${String(error)}`;
      result.retryErrors.push(errorMessage);
      result.failedRetries++;
      task.status = "failed";
      task.errorSummary = errorMessage;
      cdsExtractorLog("error", errorMessage);
    }
  }
  result.executionDurationMs = Date.now() - startTime;
  cdsExtractorLog(
    "info",
    `Retry execution completed for project ${project.projectDir}: ${result.successfulRetries} successful, ${result.failedRetries} failed`
  );
  return result;
}
function updateDependencyGraphWithRetryResults(dependencyGraph2, retryResults) {
  dependencyGraph2.retryStatus.totalRetryAttempts = retryResults.totalSuccessfulRetries + retryResults.totalFailedRetries;
}

// src/cds/compiler/graph.ts
function attemptCompilation(task, cdsCommand, cacheDir, dependencyGraph2) {
  const startTime = /* @__PURE__ */ new Date();
  const attemptId = `${task.id}_${startTime.getTime()}`;
  const attempt = {
    id: attemptId,
    cdsCommand,
    cacheDir,
    timestamp: startTime,
    result: {
      success: false,
      timestamp: startTime
    }
  };
  try {
    const primarySourceFile = task.sourceFiles[0];
    const compilationResult = compileCdsToJson(
      primarySourceFile,
      dependencyGraph2.sourceRootDir,
      cdsCommand,
      cacheDir,
      // Convert CDS projects to BasicCdsProject format expected by compileCdsToJson
      new Map(
        Array.from(dependencyGraph2.projects.entries()).map(([key, value]) => [
          key,
          {
            cdsFiles: value.cdsFiles,
            compilationTargets: value.compilationTargets,
            expectedOutputFile: value.expectedOutputFile,
            projectDir: value.projectDir,
            dependencies: value.dependencies,
            imports: value.imports,
            packageJson: value.packageJson,
            compilationConfig: value.compilationConfig
          }
        ])
      ),
      task.projectDir
    );
    const endTime = /* @__PURE__ */ new Date();
    attempt.result = {
      ...compilationResult,
      timestamp: endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      commandUsed: cdsCommand,
      cacheDir
    };
    if (compilationResult.success && compilationResult.outputPath) {
      dependencyGraph2.statusSummary.jsonFilesGenerated++;
    }
  } catch (error) {
    const endTime = /* @__PURE__ */ new Date();
    attempt.error = {
      message: String(error),
      stack: error instanceof Error ? error.stack : void 0
    };
    attempt.result.timestamp = endTime;
    attempt.result.durationMs = endTime.getTime() - startTime.getTime();
  }
  task.attempts.push(attempt);
  return attempt;
}
function createCompilationTask(type, sourceFiles, expectedOutputFile, projectDir) {
  const defaultPrimaryCommand = {
    executable: "cds",
    args: [],
    originalCommand: "cds"
  };
  const defaultRetryCommand = {
    executable: "npx",
    args: ["cds"],
    originalCommand: "npx cds"
  };
  return {
    id: `${type}_${projectDir}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    status: "pending",
    sourceFiles,
    expectedOutputFile,
    projectDir,
    attempts: [],
    dependencies: [],
    primaryCommand: defaultPrimaryCommand,
    retryCommand: defaultRetryCommand
  };
}
function createCompilationConfig(cdsCommand, cacheDir) {
  return {
    cdsCommand,
    cacheDir,
    versionCompatibility: {
      isCompatible: true
      // Will be validated during planning
    },
    maxRetryAttempts: 3
  };
}
function executeCompilationTask(task, project, dependencyGraph2, _codeqlExePath) {
  task.status = "in_progress";
  const config = project.enhancedCompilationConfig;
  if (!config) {
    throw new Error(`No compilation configuration found for project ${project.projectDir}`);
  }
  const compilationAttempt = attemptCompilation(
    task,
    config.cdsCommand,
    config.cacheDir,
    dependencyGraph2
  );
  if (compilationAttempt.result.success) {
    task.status = "success";
    return;
  }
  const lastError = compilationAttempt.error ? new Error(compilationAttempt.error.message) : new Error("Compilation failed");
  task.status = "failed";
  task.errorSummary = lastError?.message || "Compilation failed";
  cdsExtractorLog("error", `Compilation failed for task ${task.id}: ${task.errorSummary}`);
}
function executeCompilationTasks(dependencyGraph2, codeqlExePath2) {
  cdsExtractorLog("info", "Starting compilation execution for all projects...");
  dependencyGraph2.currentPhase = "compiling";
  const compilationStartTime = /* @__PURE__ */ new Date();
  const allTasks = [];
  for (const project of dependencyGraph2.projects.values()) {
    for (const task of project.compilationTasks) {
      allTasks.push({ task, project });
    }
  }
  cdsExtractorLog("info", `Executing ${allTasks.length} compilation task(s)...`);
  for (const { task, project } of allTasks) {
    try {
      executeCompilationTask(task, project, dependencyGraph2, codeqlExePath2);
    } catch (error) {
      const errorMessage = `Failed to execute compilation task ${task.id}: ${String(error)}`;
      cdsExtractorLog("error", errorMessage);
      dependencyGraph2.errors.critical.push({
        phase: "compiling",
        message: errorMessage,
        timestamp: /* @__PURE__ */ new Date(),
        stack: error instanceof Error ? error.stack : void 0
      });
      task.status = "failed";
      task.errorSummary = errorMessage;
      dependencyGraph2.statusSummary.failedCompilations++;
    }
  }
  for (const project of dependencyGraph2.projects.values()) {
    const allTasksCompleted = project.compilationTasks.every(
      (task) => task.status === "success" || task.status === "failed"
    );
    if (allTasksCompleted) {
      const hasFailedTasks = project.compilationTasks.some((task) => task.status === "failed");
      project.status = hasFailedTasks ? "failed" : "completed";
      project.timestamps.compilationCompleted = /* @__PURE__ */ new Date();
    }
  }
  const compilationEndTime = /* @__PURE__ */ new Date();
  dependencyGraph2.statusSummary.performance.compilationDurationMs = compilationEndTime.getTime() - compilationStartTime.getTime();
  cdsExtractorLog(
    "info",
    `Compilation execution completed. Success: ${dependencyGraph2.statusSummary.successfulCompilations}, Failed: ${dependencyGraph2.statusSummary.failedCompilations}`
  );
}
function orchestrateCompilation(dependencyGraph2, projectCacheDirMap2, codeqlExePath2) {
  try {
    planCompilationTasks(dependencyGraph2, projectCacheDirMap2);
    executeCompilationTasks(dependencyGraph2, codeqlExePath2);
    updateCdsDependencyGraphStatus(dependencyGraph2, dependencyGraph2.sourceRootDir);
    cdsExtractorLog("info", "Starting retry orchestration phase...");
    const retryResults = orchestrateRetryAttempts(dependencyGraph2, codeqlExePath2);
    updateCdsDependencyGraphStatus(dependencyGraph2, dependencyGraph2.sourceRootDir);
    if (retryResults.totalTasksRequiringRetry > 0) {
      cdsExtractorLog(
        "info",
        `Retry phase completed: ${retryResults.totalTasksRequiringRetry} tasks retried, ${retryResults.totalSuccessfulRetries} successful, ${retryResults.totalFailedRetries} failed`
      );
    } else {
      cdsExtractorLog("info", "Retry phase completed: no tasks required retry");
    }
    const hasFailures = dependencyGraph2.statusSummary.failedCompilations > 0 || dependencyGraph2.errors.critical.length > 0;
    dependencyGraph2.statusSummary.overallSuccess = !hasFailures;
    dependencyGraph2.currentPhase = hasFailures ? "failed" : "completed";
    const statusReport = generateStatusReport(dependencyGraph2);
    cdsExtractorLog("info", "CDS Extractor Status Report : Post-Compilation...\n" + statusReport);
  } catch (error) {
    const errorMessage = `Compilation orchestration failed: ${String(error)}`;
    cdsExtractorLog("error", errorMessage);
    dependencyGraph2.errors.critical.push({
      phase: "compiling",
      message: errorMessage,
      timestamp: /* @__PURE__ */ new Date(),
      stack: error instanceof Error ? error.stack : void 0
    });
    dependencyGraph2.currentPhase = "failed";
    dependencyGraph2.statusSummary.overallSuccess = false;
    throw error;
  }
}
function planCompilationTasks(dependencyGraph2, projectCacheDirMap2) {
  cdsExtractorLog("info", "Planning compilation tasks for all projects...");
  dependencyGraph2.currentPhase = "compilation_planning";
  for (const [projectDir, project] of dependencyGraph2.projects.entries()) {
    try {
      const cacheDir = projectCacheDirMap2.get(projectDir);
      const commands = determineVersionAwareCdsCommands(
        cacheDir,
        dependencyGraph2.sourceRootDir,
        projectDir,
        dependencyGraph2
      );
      const cdsCommand = determineCdsCommand(cacheDir, dependencyGraph2.sourceRootDir);
      const compilationConfig = createCompilationConfig(cdsCommand, cacheDir);
      project.enhancedCompilationConfig = compilationConfig;
      const task = createCompilationTask(
        "project",
        project.cdsFiles,
        project.expectedOutputFile,
        projectDir
      );
      task.primaryCommand = commands.primaryCommand;
      task.retryCommand = commands.retryCommand;
      project.compilationTasks = [task];
      project.status = "compilation_planned";
      project.timestamps.compilationStarted = /* @__PURE__ */ new Date();
      cdsExtractorLog(
        "info",
        `Planned ${project.compilationTasks.length} compilation task(s) for project ${projectDir}`
      );
    } catch (error) {
      const errorMessage = `Failed to plan compilation for project ${projectDir}: ${String(error)}`;
      cdsExtractorLog("error", errorMessage);
      dependencyGraph2.errors.critical.push({
        phase: "compilation_planning",
        message: errorMessage,
        timestamp: /* @__PURE__ */ new Date(),
        stack: error instanceof Error ? error.stack : void 0
      });
      project.status = "failed";
    }
  }
  const totalTasks = Array.from(dependencyGraph2.projects.values()).reduce(
    (sum, project) => sum + project.compilationTasks.length,
    0
  );
  dependencyGraph2.statusSummary.totalCompilationTasks = totalTasks;
  cdsExtractorLog("info", `Compilation planning completed. Total tasks: ${totalTasks}`);
}

// src/cds/compiler/project.ts
var import_path9 = require("path");

// src/cds/parser/graph.ts
var import_path11 = require("path");

// src/cds/parser/functions.ts
var import_fs6 = require("fs");
var import_path10 = require("path");
function determineCdsFilesForProjectDir(sourceRootDir, projectDir) {
  if (!sourceRootDir || !projectDir) {
    throw new Error(
      `Unable to determine CDS files for project dir '${projectDir}'; both sourceRootDir and projectDir must be provided.`
    );
  }
  const normalizedSourceRoot = sourceRootDir.replace(/[/\\]+$/, "");
  const normalizedProjectDir = projectDir.replace(/[/\\]+$/, "");
  if (!normalizedProjectDir.startsWith(normalizedSourceRoot) && normalizedProjectDir !== normalizedSourceRoot) {
    throw new Error(
      "projectDir must be a subdirectory of sourceRootDir or equal to sourceRootDir."
    );
  }
  try {
    const cdsFiles = sync((0, import_path10.join)(projectDir, "**/*.cds"), {
      nodir: true,
      ignore: ["**/node_modules/**", "**/*.testproj/**"]
    });
    return cdsFiles.map((file) => (0, import_path10.relative)(sourceRootDir, file));
  } catch (error) {
    cdsExtractorLog("error", `Error finding CDS files in ${projectDir}: ${String(error)}`);
    return [];
  }
}
function determineCdsProjectsUnderSourceDir(sourceRootDir) {
  if (!sourceRootDir || !(0, import_fs6.existsSync)(sourceRootDir)) {
    throw new Error(`Source root directory '${sourceRootDir}' does not exist.`);
  }
  const foundProjects = /* @__PURE__ */ new Set();
  const packageJsonFiles = sync((0, import_path10.join)(sourceRootDir, "**/package.json"), {
    nodir: true,
    ignore: ["**/node_modules/**", "**/*.testproj/**"]
  });
  const cdsFiles = sync((0, import_path10.join)(sourceRootDir, "**/*.cds"), {
    nodir: true,
    ignore: ["**/node_modules/**", "**/*.testproj/**"]
  });
  const candidateDirectories = /* @__PURE__ */ new Set();
  for (const packageJsonFile of packageJsonFiles) {
    candidateDirectories.add((0, import_path10.dirname)(packageJsonFile));
  }
  for (const cdsFile of cdsFiles) {
    const cdsDir = (0, import_path10.dirname)(cdsFile);
    const projectRoot = findProjectRootFromCdsFile(cdsDir, sourceRootDir);
    if (projectRoot) {
      candidateDirectories.add(projectRoot);
    } else {
      candidateDirectories.add(cdsDir);
    }
  }
  for (const dir of candidateDirectories) {
    if (isLikelyCdsProject(dir)) {
      const relativePath = (0, import_path10.relative)(sourceRootDir, dir);
      const projectDir = relativePath || ".";
      let shouldAdd = true;
      const existingProjects = Array.from(foundProjects);
      for (const existingProject of existingProjects) {
        const existingAbsPath = (0, import_path10.join)(sourceRootDir, existingProject);
        if (dir.startsWith(existingAbsPath + import_path10.sep)) {
          const parentPackageJsonPath = (0, import_path10.join)(existingAbsPath, "package.json");
          const parentPackageJson = readPackageJsonFile(parentPackageJsonPath);
          const isParentMonorepo = parentPackageJson?.workspaces && Array.isArray(parentPackageJson.workspaces) && parentPackageJson.workspaces.length > 0;
          if (isParentMonorepo && (hasStandardCdsContent(existingAbsPath) || hasDirectCdsContent(existingAbsPath))) {
            shouldAdd = true;
          } else {
            shouldAdd = false;
          }
          break;
        }
        if (existingAbsPath.startsWith(dir + import_path10.sep)) {
          const currentPackageJsonPath = (0, import_path10.join)(dir, "package.json");
          const currentPackageJson = readPackageJsonFile(currentPackageJsonPath);
          const isCurrentMonorepo = currentPackageJson?.workspaces && Array.isArray(currentPackageJson.workspaces) && currentPackageJson.workspaces.length > 0;
          if (!(isCurrentMonorepo && isLikelyCdsProject(existingAbsPath))) {
            foundProjects.delete(existingProject);
          }
        }
      }
      if (shouldAdd) {
        foundProjects.add(projectDir);
      }
    }
  }
  return Array.from(foundProjects).sort();
}
function extractCdsImports(filePath) {
  if (!(0, import_fs6.existsSync)(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const content = (0, import_fs6.readFileSync)(filePath, "utf8");
  const imports = [];
  const usingRegex = /using\s+(?:{[^}]+}|[\w.]+(?:\s+as\s+[\w.]+)?)\s+from\s+['"`]([^'"`]+)['"`]\s*;/g;
  let match2;
  while ((match2 = usingRegex.exec(content)) !== null) {
    const path2 = match2[1];
    imports.push({
      statement: match2[0],
      path: path2,
      isRelative: path2.startsWith("./") || path2.startsWith("../"),
      isModule: !path2.startsWith("./") && !path2.startsWith("../") && !path2.startsWith("/")
    });
  }
  return imports;
}
function findProjectRootFromCdsFile(cdsFileDir, sourceRootDir) {
  if (cdsFileDir.includes("node_modules") || cdsFileDir.includes(".testproj")) {
    return null;
  }
  let currentDir = cdsFileDir;
  while (currentDir.startsWith(sourceRootDir)) {
    if (isLikelyCdsProject(currentDir)) {
      const currentDirName = (0, import_path10.basename)(currentDir);
      const isStandardSubdir = ["srv", "db", "app"].includes(currentDirName);
      if (isStandardSubdir) {
        const parentDir3 = (0, import_path10.dirname)(currentDir);
        if (parentDir3 !== currentDir && parentDir3.startsWith(sourceRootDir) && !parentDir3.includes("node_modules") && !parentDir3.includes(".testproj") && isLikelyCdsProject(parentDir3)) {
          return parentDir3;
        }
      }
      const parentDir2 = (0, import_path10.dirname)(currentDir);
      if (parentDir2 !== currentDir && parentDir2.startsWith(sourceRootDir) && !parentDir2.includes("node_modules") && !parentDir2.includes(".testproj")) {
        const hasDbDir2 = (0, import_fs6.existsSync)((0, import_path10.join)(parentDir2, "db")) && (0, import_fs6.statSync)((0, import_path10.join)(parentDir2, "db")).isDirectory();
        const hasSrvDir2 = (0, import_fs6.existsSync)((0, import_path10.join)(parentDir2, "srv")) && (0, import_fs6.statSync)((0, import_path10.join)(parentDir2, "srv")).isDirectory();
        const hasAppDir2 = (0, import_fs6.existsSync)((0, import_path10.join)(parentDir2, "app")) && (0, import_fs6.statSync)((0, import_path10.join)(parentDir2, "app")).isDirectory();
        if (hasDbDir2 && hasSrvDir2 || hasSrvDir2 && hasAppDir2) {
          return parentDir2;
        }
      }
      return currentDir;
    }
    const hasDbDir = (0, import_fs6.existsSync)((0, import_path10.join)(currentDir, "db")) && (0, import_fs6.statSync)((0, import_path10.join)(currentDir, "db")).isDirectory();
    const hasSrvDir = (0, import_fs6.existsSync)((0, import_path10.join)(currentDir, "srv")) && (0, import_fs6.statSync)((0, import_path10.join)(currentDir, "srv")).isDirectory();
    const hasAppDir = (0, import_fs6.existsSync)((0, import_path10.join)(currentDir, "app")) && (0, import_fs6.statSync)((0, import_path10.join)(currentDir, "app")).isDirectory();
    if (hasDbDir && hasSrvDir || hasSrvDir && hasAppDir) {
      return currentDir;
    }
    const parentDir = (0, import_path10.dirname)(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return cdsFileDir;
}
function isLikelyCdsProject(dir) {
  try {
    if (dir.includes("node_modules") || dir.includes(".testproj")) {
      return false;
    }
    const hasStandardCdsDirectories = hasStandardCdsContent(dir);
    const hasDirectCdsFiles = hasDirectCdsContent(dir);
    const hasCdsFiles = hasStandardCdsDirectories || hasDirectCdsFiles;
    const hasCapDependencies = hasPackageJsonWithCapDeps(dir);
    if (hasCapDependencies) {
      if (!hasCdsFiles) {
        return false;
      }
      const packageJsonPath = (0, import_path10.join)(dir, "package.json");
      const packageJson = readPackageJsonFile(packageJsonPath);
      if (packageJson?.workspaces && Array.isArray(packageJson.workspaces) && packageJson.workspaces.length > 0) {
        if (!hasCdsFiles) {
          return false;
        }
      }
      return true;
    }
    return hasCdsFiles;
  } catch (error) {
    cdsExtractorLog("error", `Error checking directory ${dir}: ${String(error)}`);
    return false;
  }
}
function hasStandardCdsContent(dir) {
  const standardLocations = [(0, import_path10.join)(dir, "db"), (0, import_path10.join)(dir, "srv"), (0, import_path10.join)(dir, "app")];
  for (const location of standardLocations) {
    if ((0, import_fs6.existsSync)(location) && (0, import_fs6.statSync)(location).isDirectory()) {
      const cdsFiles = sync((0, import_path10.join)(location, "**/*.cds"), { nodir: true });
      if (cdsFiles.length > 0) {
        return true;
      }
    }
  }
  return false;
}
function hasDirectCdsContent(dir) {
  const directCdsFiles = sync((0, import_path10.join)(dir, "*.cds"));
  return directCdsFiles.length > 0;
}
function readPackageJsonFile(filePath) {
  if (!(0, import_fs6.existsSync)(filePath)) {
    return void 0;
  }
  try {
    const content = (0, import_fs6.readFileSync)(filePath, "utf8");
    const packageJson = JSON.parse(content);
    return packageJson;
  } catch (error) {
    cdsExtractorLog("warn", `Error parsing package.json at ${filePath}: ${String(error)}`);
    return void 0;
  }
}
function determineCdsFilesToCompile(sourceRootDir, project) {
  if (!project.cdsFiles || project.cdsFiles.length === 0) {
    return {
      compilationTargets: [],
      expectedOutputFile: (0, import_path10.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const absoluteProjectDir = (0, import_path10.join)(sourceRootDir, project.projectDir);
  const capDirectories = ["db", "srv", "app"];
  const existingCapDirs = capDirectories.filter((dir) => (0, import_fs6.existsSync)((0, import_path10.join)(absoluteProjectDir, dir)));
  if (existingCapDirs.length > 0) {
    return {
      compilationTargets: existingCapDirs,
      expectedOutputFile: (0, import_path10.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const rootCdsFiles = project.cdsFiles.filter((file) => (0, import_path10.dirname)((0, import_path10.join)(sourceRootDir, file)) === absoluteProjectDir).map((file) => (0, import_path10.basename)(file));
  if (rootCdsFiles.length > 0) {
    return {
      compilationTargets: rootCdsFiles,
      expectedOutputFile: (0, import_path10.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const compilationTargets = project.cdsFiles.map(
    (file) => (0, import_path10.relative)(absoluteProjectDir, (0, import_path10.join)(sourceRootDir, file))
  );
  return {
    compilationTargets,
    expectedOutputFile: (0, import_path10.join)(project.projectDir, modelCdsJsonFile)
  };
}
function hasPackageJsonWithCapDeps(dir) {
  try {
    const packageJsonPath = (0, import_path10.join)(dir, "package.json");
    const packageJson = readPackageJsonFile(packageJsonPath);
    if (packageJson) {
      const dependencies = {
        ...packageJson.dependencies ?? {},
        ...packageJson.devDependencies ?? {}
      };
      return !!(dependencies["@sap/cds"] || dependencies["@sap/cds-dk"]);
    }
    return false;
  } catch {
    return false;
  }
}

// src/cds/parser/graph.ts
function buildBasicCdsProjectDependencyGraph(sourceRootDir) {
  cdsExtractorLog("info", "Detecting CDS projects...");
  const projectDirs = determineCdsProjectsUnderSourceDir(sourceRootDir);
  if (projectDirs.length === 0) {
    cdsExtractorLog("info", "No CDS projects found.");
    return /* @__PURE__ */ new Map();
  }
  cdsExtractorLog("info", `Found ${projectDirs.length} CDS project(s) under source directory.`);
  const projectMap = /* @__PURE__ */ new Map();
  for (const projectDir of projectDirs) {
    const absoluteProjectDir = (0, import_path11.join)(sourceRootDir, projectDir);
    const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);
    const packageJsonPath = (0, import_path11.join)(absoluteProjectDir, "package.json");
    const packageJson = readPackageJsonFile(packageJsonPath);
    projectMap.set(projectDir, {
      projectDir,
      cdsFiles,
      compilationTargets: [],
      // Will be populated in the third pass
      expectedOutputFile: (0, import_path11.join)(projectDir, modelCdsJsonFile),
      packageJson,
      dependencies: [],
      imports: /* @__PURE__ */ new Map()
    });
  }
  cdsExtractorLog("info", "Analyzing dependencies between CDS projects...");
  for (const [projectDir, project] of projectMap.entries()) {
    for (const relativeFilePath of project.cdsFiles) {
      const absoluteFilePath = (0, import_path11.join)(sourceRootDir, relativeFilePath);
      try {
        const imports = extractCdsImports(absoluteFilePath);
        const enrichedImports = [];
        for (const importInfo of imports) {
          const enrichedImport = { ...importInfo };
          if (importInfo.isRelative) {
            const importedFilePath = (0, import_path11.resolve)((0, import_path11.dirname)(absoluteFilePath), importInfo.path);
            const normalizedImportedPath = importedFilePath.endsWith(".cds") ? importedFilePath : `${importedFilePath}.cds`;
            try {
              const relativeToDirPath = (0, import_path11.dirname)(relativeFilePath);
              const resolvedPath = (0, import_path11.resolve)((0, import_path11.join)(sourceRootDir, relativeToDirPath), importInfo.path);
              const normalizedResolvedPath = resolvedPath.endsWith(".cds") ? resolvedPath : `${resolvedPath}.cds`;
              if (normalizedResolvedPath.startsWith(sourceRootDir)) {
                enrichedImport.resolvedPath = normalizedResolvedPath.substring(sourceRootDir.length).replace(/^[/\\]/, "");
              }
            } catch (error) {
              cdsExtractorLog(
                "warn",
                `Could not resolve import path for ${importInfo.path} in ${relativeFilePath}: ${String(error)}`
              );
            }
            for (const [otherProjectDir, otherProject] of projectMap.entries()) {
              if (otherProjectDir === projectDir) continue;
              const otherProjectAbsoluteDir = (0, import_path11.join)(sourceRootDir, otherProjectDir);
              const isInOtherProject = otherProject.cdsFiles.some((otherFile) => {
                const otherAbsolutePath = (0, import_path11.join)(sourceRootDir, otherFile);
                return otherAbsolutePath === normalizedImportedPath || normalizedImportedPath.startsWith(otherProjectAbsoluteDir + import_path11.sep);
              });
              if (isInOtherProject) {
                project.dependencies ??= [];
                if (!project.dependencies.includes(otherProject)) {
                  project.dependencies.push(otherProject);
                }
              }
            }
          } else if (importInfo.isModule && project.packageJson) {
            const dependencies = {
              ...project.packageJson.dependencies ?? {},
              ...project.packageJson.devDependencies ?? {}
            };
            const moduleName = importInfo.path.split("/")[0].startsWith("@") ? importInfo.path.split("/").slice(0, 2).join("/") : importInfo.path.split("/")[0];
            if (dependencies[moduleName]) {
            }
          }
          enrichedImports.push(enrichedImport);
        }
        project.imports?.set(relativeFilePath, enrichedImports);
      } catch (error) {
        cdsExtractorLog(
          "warn",
          `Error processing imports in ${absoluteFilePath}: ${String(error)}`
        );
      }
    }
  }
  cdsExtractorLog(
    "info",
    "Determining CDS files to compile and expected output files for each project..."
  );
  for (const [, project] of projectMap.entries()) {
    try {
      const projectPlan = determineCdsFilesToCompile(sourceRootDir, project);
      project.compilationTargets = projectPlan.compilationTargets;
      project.expectedOutputFile = projectPlan.expectedOutputFile;
    } catch (error) {
      cdsExtractorLog(
        "warn",
        `Error determining files to compile for project ${project.projectDir}: ${String(error)}`
      );
      project.compilationTargets = project.cdsFiles.map((file) => (0, import_path11.basename)(file));
      project.expectedOutputFile = (0, import_path11.join)(project.projectDir, modelCdsJsonFile);
    }
  }
  return projectMap;
}
function buildCdsProjectDependencyGraph(sourceRootDir) {
  const startTime = /* @__PURE__ */ new Date();
  const dependencyGraph2 = {
    id: `cds_graph_${Date.now()}`,
    sourceRootDir,
    projects: /* @__PURE__ */ new Map(),
    debugInfo: {
      extractor: {
        runMode: "autobuild",
        sourceRootDir,
        startTime,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
          argv: process.argv
        }
      },
      parser: {
        projectsDetected: 0,
        cdsFilesFound: 0,
        dependencyResolutionSuccess: true,
        parsingErrors: [],
        parsingWarnings: []
      },
      compiler: {
        availableCommands: [],
        selectedCommand: "",
        cacheDirectories: [],
        cacheInitialized: false
      }
    },
    currentPhase: "parsing",
    statusSummary: {
      overallSuccess: false,
      totalProjects: 0,
      totalCdsFiles: 0,
      totalCompilationTasks: 0,
      successfulCompilations: 0,
      failedCompilations: 0,
      skippedCompilations: 0,
      jsonFilesGenerated: 0,
      criticalErrors: [],
      warnings: [],
      performance: {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        compilationDurationMs: 0,
        extractionDurationMs: 0
      }
    },
    config: {
      maxRetryAttempts: 3,
      enableDetailedLogging: false,
      // Debug modes removed
      generateDebugOutput: false,
      // Debug modes removed
      compilationTimeoutMs: 3e4
      // 30 seconds
    },
    errors: {
      critical: [],
      warnings: []
    },
    retryStatus: {
      totalTasksRequiringRetry: 0,
      totalTasksSuccessfullyRetried: 0,
      totalRetryAttempts: 0,
      projectsRequiringFullDependencies: /* @__PURE__ */ new Set(),
      projectsWithFullDependencies: /* @__PURE__ */ new Set()
    }
  };
  try {
    const basicProjectMap = buildBasicCdsProjectDependencyGraph(sourceRootDir);
    for (const [projectDir, basicProject] of basicProjectMap.entries()) {
      const cdsProject = {
        ...basicProject,
        id: `project_${projectDir.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
        enhancedCompilationConfig: void 0,
        // Will be set during compilation planning
        compilationTasks: [],
        parserDebugInfo: {
          dependenciesResolved: [],
          importErrors: [],
          parseErrors: /* @__PURE__ */ new Map()
        },
        status: "discovered",
        timestamps: {
          discovered: /* @__PURE__ */ new Date()
        }
      };
      dependencyGraph2.projects.set(projectDir, cdsProject);
    }
    dependencyGraph2.statusSummary.totalProjects = dependencyGraph2.projects.size;
    dependencyGraph2.statusSummary.totalCdsFiles = Array.from(
      dependencyGraph2.projects.values()
    ).reduce((sum, project) => sum + project.cdsFiles.length, 0);
    dependencyGraph2.debugInfo.parser.projectsDetected = dependencyGraph2.projects.size;
    dependencyGraph2.debugInfo.parser.cdsFilesFound = dependencyGraph2.statusSummary.totalCdsFiles;
    dependencyGraph2.currentPhase = "dependency_resolution";
    const endTime = /* @__PURE__ */ new Date();
    dependencyGraph2.debugInfo.extractor.endTime = endTime;
    dependencyGraph2.debugInfo.extractor.durationMs = endTime.getTime() - startTime.getTime();
    dependencyGraph2.statusSummary.performance.parsingDurationMs = dependencyGraph2.debugInfo.extractor.durationMs;
    cdsExtractorLog(
      "info",
      `CDS dependency graph created with ${dependencyGraph2.projects.size} projects and ${dependencyGraph2.statusSummary.totalCdsFiles} CDS files`
    );
    return dependencyGraph2;
  } catch (error) {
    const errorMessage = `Failed to build CDS dependency graph: ${String(error)}`;
    cdsExtractorLog("error", errorMessage);
    dependencyGraph2.errors.critical.push({
      phase: "parsing",
      message: errorMessage,
      timestamp: /* @__PURE__ */ new Date(),
      stack: error instanceof Error ? error.stack : void 0
    });
    dependencyGraph2.currentPhase = "failed";
    return dependencyGraph2;
  }
}

// src/codeql.ts
var import_child_process9 = require("child_process");

// src/environment.ts
var import_child_process8 = require("child_process");
var import_fs7 = require("fs");
var import_os = require("os");
var import_path12 = require("path");
function getPlatformInfo() {
  const osPlatform = (0, import_os.platform)();
  const osPlatformArch = (0, import_os.arch)();
  const isWindows = osPlatform === "win32";
  const exeExtension = isWindows ? ".exe" : "";
  return {
    platform: osPlatform,
    arch: osPlatformArch,
    isWindows,
    exeExtension
  };
}
function getCodeQLExePath() {
  const platformInfo2 = getPlatformInfo();
  const codeqlExeName = platformInfo2.isWindows ? "codeql.exe" : "codeql";
  const codeqlDist = process.env.CODEQL_DIST;
  if (codeqlDist) {
    const codeqlPathFromDist = (0, import_path12.resolve)((0, import_path12.join)(codeqlDist, codeqlExeName));
    if ((0, import_fs7.existsSync)(codeqlPathFromDist)) {
      cdsExtractorLog("info", `Using CodeQL executable from CODEQL_DIST: ${codeqlPathFromDist}`);
      return codeqlPathFromDist;
    } else {
      cdsExtractorLog(
        "error",
        `CODEQL_DIST is set to '${codeqlDist}', but CodeQL executable was not found at '${codeqlPathFromDist}'. Please ensure this path is correct. Falling back to PATH-based discovery.`
      );
    }
  }
  cdsExtractorLog(
    "info",
    'CODEQL_DIST environment variable not set or invalid. Attempting to find CodeQL executable via system PATH using "codeql version --format=json".'
  );
  try {
    const versionOutput = (0, import_child_process8.execFileSync)(codeqlExeName, ["version", "--format=json"], {
      encoding: "utf8",
      timeout: 5e3,
      // 5 seconds timeout
      stdio: "pipe"
      // Suppress output to console
    });
    try {
      const versionInfo = JSON.parse(versionOutput);
      if (versionInfo && typeof versionInfo.unpackedLocation === "string" && versionInfo.unpackedLocation) {
        const resolvedPathFromVersion = (0, import_path12.resolve)((0, import_path12.join)(versionInfo.unpackedLocation, codeqlExeName));
        if ((0, import_fs7.existsSync)(resolvedPathFromVersion)) {
          cdsExtractorLog(
            "info",
            `CodeQL executable found via 'codeql version --format=json' at: ${resolvedPathFromVersion}`
          );
          return resolvedPathFromVersion;
        }
        cdsExtractorLog(
          "warn",
          `'codeql version --format=json' provided unpackedLocation '${versionInfo.unpackedLocation}', but executable not found at '${resolvedPathFromVersion}'.`
        );
      } else {
        cdsExtractorLog(
          "warn",
          "Could not determine CodeQL executable path from 'codeql version --format=json' output. 'unpackedLocation' field missing, empty, or invalid."
        );
      }
    } catch (parseError) {
      cdsExtractorLog(
        "warn",
        `Failed to parse 'codeql version --format=json' output: ${String(parseError)}. Output was: ${versionOutput}`
      );
    }
  } catch (error) {
    let errorMessage = `INFO: Failed to find CodeQL executable via 'codeql version --format=json'. Error: ${String(error)}`;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      errorMessage += `
INFO: The command '${codeqlExeName}' was not found in your system PATH.`;
    }
    cdsExtractorLog("info", errorMessage);
  }
  cdsExtractorLog(
    "error",
    'Failed to determine CodeQL executable path. Please ensure the CODEQL_DIST environment variable is set and points to a valid CodeQL distribution, or that the CodeQL CLI (codeql) is available in your system PATH and "codeql version --format=json" can provide its location.'
  );
  return "";
}
function getJavaScriptExtractorRoot(codeqlExePath2) {
  let jsExtractorRoot = process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT ?? "";
  if (jsExtractorRoot) {
    cdsExtractorLog(
      "info",
      `Using JavaScript extractor root from environment variable CODEQL_EXTRACTOR_JAVASCRIPT_ROOT: ${jsExtractorRoot}`
    );
    return jsExtractorRoot;
  }
  if (!codeqlExePath2) {
    cdsExtractorLog(
      "warn",
      "Cannot resolve JavaScript extractor root because the CodeQL executable path was not provided or found."
    );
    return "";
  }
  try {
    jsExtractorRoot = (0, import_child_process8.execFileSync)(
      codeqlExePath2,
      ["resolve", "extractor", "--language=javascript"],
      { stdio: "pipe" }
      // Suppress output from the command itself
    ).toString().trim();
    if (jsExtractorRoot) {
      cdsExtractorLog("info", `JavaScript extractor root resolved to: ${jsExtractorRoot}`);
    } else {
      cdsExtractorLog(
        "warn",
        `'codeql resolve extractor --language=javascript' using '${codeqlExePath2}' returned an empty path.`
      );
    }
  } catch (error) {
    cdsExtractorLog(
      "error",
      `Error resolving JavaScript extractor root using '${codeqlExePath2}': ${String(error)}`
    );
    jsExtractorRoot = "";
  }
  return jsExtractorRoot;
}
function setupJavaScriptExtractorEnv() {
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE = process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR = process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR = process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR = process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR = process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR;
  process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR = process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR;
}
function getAutobuildScriptPath(jsExtractorRoot) {
  if (!jsExtractorRoot) return "";
  const platformInfo2 = getPlatformInfo();
  const autobuildScriptName = platformInfo2.isWindows ? "autobuild.cmd" : "autobuild.sh";
  return (0, import_path12.resolve)((0, import_path12.join)(jsExtractorRoot, "tools", autobuildScriptName));
}
function configureLgtmIndexFilters() {
  let excludeFilters = "";
  if (process.env.LGTM_INDEX_FILTERS) {
    cdsExtractorLog(
      "info",
      `Found $LGTM_INDEX_FILTERS already set to:
${process.env.LGTM_INDEX_FILTERS}`
    );
    const allowedExcludePatterns = [(0, import_path12.join)("exclude:**", "*"), (0, import_path12.join)("exclude:**", "*.*")];
    excludeFilters = "\n" + process.env.LGTM_INDEX_FILTERS.split("\n").filter(
      (line) => line.startsWith("exclude") && !allowedExcludePatterns.some((pattern) => line.includes(pattern))
    ).join("\n");
  }
  const lgtmIndexFiltersPatterns = [
    (0, import_path12.join)("exclude:**", "*.*"),
    (0, import_path12.join)("include:**", "*.cds.json"),
    (0, import_path12.join)("include:**", "*.cds"),
    (0, import_path12.join)("include:**", cdsExtractorMarkerFileName),
    (0, import_path12.join)("exclude:**", "node_modules", "**", "*.*")
  ].join("\n");
  process.env.LGTM_INDEX_FILTERS = lgtmIndexFiltersPatterns + excludeFilters;
  process.env.LGTM_INDEX_TYPESCRIPT = "NONE";
  process.env.LGTM_INDEX_FILETYPES = ".cds:JSON";
}
function setupAndValidateEnvironment(sourceRoot2) {
  const errorMessages2 = [];
  const platformInfo2 = getPlatformInfo();
  const codeqlExePath2 = getCodeQLExePath();
  if (!codeqlExePath2) {
    errorMessages2.push(
      "Failed to find CodeQL executable. Ensure CODEQL_DIST is set and valid, or CodeQL CLI is in PATH."
    );
  }
  if (!dirExists(sourceRoot2)) {
    errorMessages2.push(`Project root directory '${sourceRoot2}' does not exist.`);
  }
  const jsExtractorRoot = getJavaScriptExtractorRoot(codeqlExePath2);
  if (!jsExtractorRoot) {
    if (codeqlExePath2) {
      errorMessages2.push(
        "Failed to determine JavaScript extractor root using the found CodeQL executable."
      );
    } else {
      errorMessages2.push(
        "Cannot determine JavaScript extractor root because CodeQL executable was not found."
      );
    }
  }
  if (jsExtractorRoot) {
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = jsExtractorRoot;
    setupJavaScriptExtractorEnv();
  }
  const autobuildScriptPath2 = jsExtractorRoot ? getAutobuildScriptPath(jsExtractorRoot) : "";
  return {
    success: errorMessages2.length === 0,
    errorMessages: errorMessages2,
    codeqlExePath: codeqlExePath2,
    // Will be '' if not found
    jsExtractorRoot,
    // Will be '' if not found
    autobuildScriptPath: autobuildScriptPath2,
    platformInfo: platformInfo2
  };
}

// src/codeql.ts
function runJavaScriptExtractor(sourceRoot2, autobuildScriptPath2, codeqlExePath2) {
  cdsExtractorLog(
    "info",
    `Extracting the .cds.json files by running the 'javascript' extractor autobuild script:
        ${autobuildScriptPath2}`
  );
  const result = (0, import_child_process9.spawnSync)(autobuildScriptPath2, {
    cwd: sourceRoot2,
    env: process.env,
    shell: true,
    stdio: "inherit"
  });
  if (result.error) {
    const errorMessage = `Error running JavaScript extractor: ${result.error.message}`;
    if (codeqlExePath2) {
      addJavaScriptExtractorDiagnostic(sourceRoot2, errorMessage, codeqlExePath2, sourceRoot2);
    }
    return {
      success: false,
      error: errorMessage
    };
  }
  if (result.status !== 0) {
    const errorMessage = `JavaScript extractor failed with exit code ${String(result.status)}`;
    if (codeqlExePath2) {
      addJavaScriptExtractorDiagnostic(sourceRoot2, errorMessage, codeqlExePath2, sourceRoot2);
    }
    return {
      success: false,
      error: errorMessage
    };
  }
  return { success: true };
}
function runJavaScriptExtractionWithMarker(sourceRoot2, autobuildScriptPath2, codeqlExePath2, dependencyGraph2) {
  configureLgtmIndexFilters();
  const markerFilePath = createMarkerFile(sourceRoot2);
  try {
    logPerformanceTrackingStart("JavaScript Extraction");
    const extractionStartTime = Date.now();
    const extractorResult = runJavaScriptExtractor(sourceRoot2, autobuildScriptPath2, codeqlExePath2);
    const extractionEndTime = Date.now();
    logPerformanceTrackingStop("JavaScript Extraction");
    if (dependencyGraph2) {
      dependencyGraph2.statusSummary.performance.extractionDurationMs = extractionEndTime - extractionStartTime;
      dependencyGraph2.statusSummary.performance.totalDurationMs = dependencyGraph2.statusSummary.performance.parsingDurationMs + dependencyGraph2.statusSummary.performance.compilationDurationMs + dependencyGraph2.statusSummary.performance.extractionDurationMs;
    }
    if (!extractorResult.success && extractorResult.error) {
      cdsExtractorLog("error", `Error running JavaScript extractor: ${extractorResult.error}`);
      if (codeqlExePath2) {
        let representativeFile = sourceRoot2;
        if (dependencyGraph2 && dependencyGraph2.projects.size > 0) {
          const firstProject = Array.from(dependencyGraph2.projects.values())[0];
          representativeFile = firstProject.cdsFiles[0] ?? sourceRoot2;
        }
        addJavaScriptExtractorDiagnostic(
          representativeFile,
          extractorResult.error,
          codeqlExePath2,
          sourceRoot2
        );
      }
      return false;
    }
    return true;
  } finally {
    removeMarkerFile(markerFilePath);
  }
}
function handleEarlyExit(sourceRoot2, autobuildScriptPath2, codeqlExePath2, skipMessage) {
  const success = runJavaScriptExtractionWithMarker(sourceRoot2, autobuildScriptPath2, codeqlExePath2);
  logExtractorStop(success, success ? skipMessage : "JavaScript extractor failed");
  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0);
}

// src/utils.ts
var import_path13 = require("path");
var USAGE_MESSAGE = `	Usage: node <script> <source-root>`;
function resolveSourceRoot(sourceRoot2) {
  if (!sourceRoot2 || typeof sourceRoot2 !== "string") {
    throw new Error("Source root must be a non-empty string");
  }
  const normalizedPath = (0, import_path13.resolve)(sourceRoot2);
  if (!normalizedPath || normalizedPath === "/") {
    throw new Error("Source root must point to a valid directory");
  }
  return normalizedPath;
}
function validateArguments(args) {
  if (args.length < 3) {
    return {
      isValid: false,
      usageMessage: USAGE_MESSAGE
    };
  }
  const rawSourceRoot = args[2];
  let sourceRoot2;
  try {
    sourceRoot2 = resolveSourceRoot(rawSourceRoot);
  } catch (error) {
    return {
      isValid: false,
      usageMessage: `Invalid source root: ${String(error)}`
    };
  }
  return {
    isValid: true,
    usageMessage: `<source-root>`,
    args: {
      sourceRoot: sourceRoot2
    }
  };
}

// cds-extractor.ts
var validationResult = validateArguments(process.argv);
if (!validationResult.isValid) {
  console.warn(validationResult.usageMessage);
  console.log(
    `CDS extractor terminated due to invalid arguments: ${validationResult.usageMessage}`
  );
  console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
  process.exit(0);
}
var { sourceRoot } = validationResult.args;
setSourceRootDirectory(sourceRoot);
logExtractorStart(sourceRoot);
logPerformanceTrackingStart("Environment Setup");
var {
  success: envSetupSuccess,
  errorMessages,
  codeqlExePath,
  autobuildScriptPath,
  platformInfo
} = setupAndValidateEnvironment(sourceRoot);
logPerformanceTrackingStop("Environment Setup");
if (!envSetupSuccess) {
  const codeqlExe = platformInfo.isWindows ? "codeql.exe" : "codeql";
  const errorMessage = `'${codeqlExe} database index-files --language cds' terminated early due to: ${errorMessages.join(", ")}.`;
  cdsExtractorLog("warn", errorMessage);
  if (codeqlExePath) {
    addEnvironmentSetupDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }
  logExtractorStop(
    false,
    "Warning: Environment setup failed, continuing with limited functionality"
  );
} else {
  process.chdir(sourceRoot);
}
cdsExtractorLog(
  "info",
  `CodeQL CDS extractor using autobuild mode for scan of project source root directory '${sourceRoot}'.`
);
cdsExtractorLog("info", "Building CDS project dependency graph...");
var dependencyGraph;
try {
  logPerformanceTrackingStart("Dependency Graph Build");
  dependencyGraph = buildCdsProjectDependencyGraph(sourceRoot);
  logPerformanceTrackingStop("Dependency Graph Build");
  logPerformanceMilestone(
    "Dependency graph created",
    `${dependencyGraph.projects.size} projects, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`
  );
  if (dependencyGraph.projects.size > 0) {
    for (const [projectDir, project] of dependencyGraph.projects.entries()) {
      cdsExtractorLog(
        "info",
        `Project: ${projectDir}, Status: ${project.status}, CDS files: ${project.cdsFiles.length}, Compilation targets: ${project.compilationTargets.length}`
      );
    }
  } else {
    cdsExtractorLog(
      "error",
      "No CDS projects were detected. This is an unrecoverable error as there is nothing to scan."
    );
    try {
      const allCdsFiles = Array.from(
        /* @__PURE__ */ new Set([
          ...sync((0, import_path14.join)(sourceRoot, "**/*.cds"), {
            ignore: ["**/node_modules/**", "**/.git/**"]
          })
        ])
      );
      cdsExtractorLog(
        "info",
        `Direct search found ${allCdsFiles.length} CDS files in the source tree.`
      );
      if (allCdsFiles.length > 0) {
        cdsExtractorLog(
          "info",
          `Sample CDS files: ${allCdsFiles.slice(0, 5).join(", ")}${allCdsFiles.length > 5 ? ", ..." : ""}`
        );
        cdsExtractorLog(
          "error",
          "CDS files were found but no projects were detected. This indicates a problem with project detection logic."
        );
      } else {
        cdsExtractorLog(
          "info",
          "No CDS files found in the source tree. This may be expected if the source does not contain CAP/CDS projects."
        );
      }
    } catch (globError) {
      cdsExtractorLog("warn", `Could not perform direct CDS file search: ${String(globError)}`);
    }
    const warningMessage = "No CDS projects were detected. This may be expected if the source does not contain CAP/CDS projects.";
    if (codeqlExePath) {
      addNoCdsProjectsDiagnostic(sourceRoot, warningMessage, codeqlExePath);
    }
    logExtractorStop(false, "Warning: No CDS projects detected, skipping CDS-specific processing");
    handleEarlyExit(
      sourceRoot,
      autobuildScriptPath || "",
      codeqlExePath,
      "JavaScript extraction completed (CDS processing was skipped)"
    );
  }
} catch (error) {
  const errorMessage = `Failed to build CDS dependency graph: ${String(error)}`;
  cdsExtractorLog("error", errorMessage);
  if (codeqlExePath) {
    addDependencyGraphDiagnostic(sourceRoot, errorMessage, codeqlExePath);
  }
  logExtractorStop(
    false,
    "Warning: Dependency graph build failed, skipping CDS-specific processing"
  );
  handleEarlyExit(
    sourceRoot,
    autobuildScriptPath || "",
    codeqlExePath,
    "JavaScript extraction completed (CDS processing was skipped)"
  );
}
logPerformanceTrackingStart("Dependency Installation");
var projectCacheDirMap = cacheInstallDependencies(dependencyGraph, sourceRoot, codeqlExePath);
logPerformanceTrackingStop("Dependency Installation");
if (projectCacheDirMap.size === 0) {
  cdsExtractorLog(
    "error",
    "No project cache directory mappings were created. This indicates that dependency installation failed for all discovered projects."
  );
  if (dependencyGraph.projects.size > 0) {
    const errorMessage = `Found ${dependencyGraph.projects.size} CDS projects but failed to install dependencies for any of them. Cannot proceed with compilation.`;
    cdsExtractorLog("error", errorMessage);
    if (codeqlExePath) {
      addDependencyInstallationDiagnostic(sourceRoot, errorMessage, codeqlExePath);
    }
    logExtractorStop(
      false,
      "Warning: Dependency installation failed for all projects, continuing with limited functionality"
    );
  }
  cdsExtractorLog(
    "warn",
    "No projects and no cache mappings - this should have been detected earlier."
  );
}
var cdsFilePathsToProcess = [];
for (const project of dependencyGraph.projects.values()) {
  cdsFilePathsToProcess.push(...project.cdsFiles);
}
cdsExtractorLog(
  "info",
  `Found ${cdsFilePathsToProcess.length} total CDS files, ${dependencyGraph.statusSummary.totalCdsFiles} CDS files in dependency graph`
);
logPerformanceTrackingStart("CDS Compilation");
try {
  orchestrateCompilation(dependencyGraph, projectCacheDirMap, codeqlExePath);
  if (!dependencyGraph.statusSummary.overallSuccess) {
    cdsExtractorLog(
      "error",
      `Compilation completed with failures: ${dependencyGraph.statusSummary.failedCompilations} failed out of ${dependencyGraph.statusSummary.totalCompilationTasks} total tasks`
    );
    for (const error of dependencyGraph.errors.critical) {
      cdsExtractorLog("error", `Critical error in ${error.phase}: ${error.message}`);
    }
  }
  logPerformanceTrackingStop("CDS Compilation");
  logPerformanceMilestone("CDS compilation completed");
} catch (error) {
  logPerformanceTrackingStop("CDS Compilation");
  cdsExtractorLog("error", `Compilation orchestration failed: ${String(error)}`);
  if (cdsFilePathsToProcess.length > 0) {
    addCompilationDiagnostic(
      cdsFilePathsToProcess[0],
      `Compilation orchestration failed: ${String(error)}`,
      codeqlExePath,
      sourceRoot
    );
  }
}
var extractionSuccess = runJavaScriptExtractionWithMarker(
  sourceRoot,
  autobuildScriptPath,
  codeqlExePath,
  dependencyGraph
);
logExtractorStop(
  extractionSuccess,
  extractionSuccess ? "CDS extraction completed successfully" : "JavaScript extractor failed"
);
cdsExtractorLog(
  "info",
  "CDS Extractor Status Report : Final...\n" + generateStatusReport(dependencyGraph)
);
console.log(`Completed run of the cds-extractor.js script for the CDS extractor.`);
//# sourceMappingURL=cds-extractor.bundle.js.map
