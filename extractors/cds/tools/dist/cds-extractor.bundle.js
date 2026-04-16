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
var import_path16 = require("path");

// node_modules/glob/dist/esm/index.min.js
var import_node_url = require("node:url");
var import_node_path = require("node:path");
var import_node_url2 = require("node:url");
var import_fs = require("fs");
var xi = __toESM(require("node:fs"), 1);
var import_promises = require("node:fs/promises");
var import_node_events = require("node:events");
var import_node_stream = __toESM(require("node:stream"), 1);
var import_node_string_decoder = require("node:string_decoder");
var Gt = (n7, t, e) => {
  let s = n7 instanceof RegExp ? ce(n7, e) : n7, i = t instanceof RegExp ? ce(t, e) : t, r = s !== null && i != null && ss(s, i, e);
  return r && { start: r[0], end: r[1], pre: e.slice(0, r[0]), body: e.slice(r[0] + s.length, r[1]), post: e.slice(r[1] + i.length) };
};
var ce = (n7, t) => {
  let e = t.match(n7);
  return e ? e[0] : null;
};
var ss = (n7, t, e) => {
  let s, i, r, o, h, a = e.indexOf(n7), l = e.indexOf(t, a + 1), u = a;
  if (a >= 0 && l > 0) {
    if (n7 === t) return [a, l];
    for (s = [], r = e.length; u >= 0 && !h; ) {
      if (u === a) s.push(u), a = e.indexOf(n7, u + 1);
      else if (s.length === 1) {
        let c = s.pop();
        c !== void 0 && (h = [c, l]);
      } else i = s.pop(), i !== void 0 && i < r && (r = i, o = l), l = e.indexOf(t, u + 1);
      u = a < l && a >= 0 ? a : l;
    }
    s.length && o !== void 0 && (h = [r, o]);
  }
  return h;
};
var fe = "\0SLASH" + Math.random() + "\0";
var ue = "\0OPEN" + Math.random() + "\0";
var qt = "\0CLOSE" + Math.random() + "\0";
var de = "\0COMMA" + Math.random() + "\0";
var pe = "\0PERIOD" + Math.random() + "\0";
var is = new RegExp(fe, "g");
var rs = new RegExp(ue, "g");
var ns = new RegExp(qt, "g");
var os = new RegExp(de, "g");
var hs = new RegExp(pe, "g");
var as = /\\\\/g;
var ls = /\\{/g;
var cs = /\\}/g;
var fs = /\\,/g;
var us = /\\./g;
var ds = 1e5;
function Ht(n7) {
  return isNaN(n7) ? n7.charCodeAt(0) : parseInt(n7, 10);
}
function ps(n7) {
  return n7.replace(as, fe).replace(ls, ue).replace(cs, qt).replace(fs, de).replace(us, pe);
}
function ms(n7) {
  return n7.replace(is, "\\").replace(rs, "{").replace(ns, "}").replace(os, ",").replace(hs, ".");
}
function me(n7) {
  if (!n7) return [""];
  let t = [], e = Gt("{", "}", n7);
  if (!e) return n7.split(",");
  let { pre: s, body: i, post: r } = e, o = s.split(",");
  o[o.length - 1] += "{" + i + "}";
  let h = me(r);
  return r.length && (o[o.length - 1] += h.shift(), o.push.apply(o, h)), t.push.apply(t, o), t;
}
function ge(n7, t = {}) {
  if (!n7) return [];
  let { max: e = ds } = t;
  return n7.slice(0, 2) === "{}" && (n7 = "\\{\\}" + n7.slice(2)), ht(ps(n7), e, true).map(ms);
}
function gs(n7) {
  return "{" + n7 + "}";
}
function ws(n7) {
  return /^-?0\d/.test(n7);
}
function ys(n7, t) {
  return n7 <= t;
}
function bs(n7, t) {
  return n7 >= t;
}
function ht(n7, t, e) {
  let s = [], i = Gt("{", "}", n7);
  if (!i) return [n7];
  let r = i.pre, o = i.post.length ? ht(i.post, t, false) : [""];
  if (/\$$/.test(i.pre)) for (let h = 0; h < o.length && h < t; h++) {
    let a = r + "{" + i.body + "}" + o[h];
    s.push(a);
  }
  else {
    let h = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(i.body), a = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(i.body), l = h || a, u = i.body.indexOf(",") >= 0;
    if (!l && !u) return i.post.match(/,(?!,).*\}/) ? (n7 = i.pre + "{" + i.body + qt + i.post, ht(n7, t, true)) : [n7];
    let c;
    if (l) c = i.body.split(/\.\./);
    else if (c = me(i.body), c.length === 1 && c[0] !== void 0 && (c = ht(c[0], t, false).map(gs), c.length === 1)) return o.map((f) => i.pre + c[0] + f);
    let d;
    if (l && c[0] !== void 0 && c[1] !== void 0) {
      let f = Ht(c[0]), m = Ht(c[1]), p = Math.max(c[0].length, c[1].length), w = c.length === 3 && c[2] !== void 0 ? Math.abs(Ht(c[2])) : 1, g = ys;
      m < f && (w *= -1, g = bs);
      let E = c.some(ws);
      d = [];
      for (let y = f; g(y, m); y += w) {
        let b;
        if (a) b = String.fromCharCode(y), b === "\\" && (b = "");
        else if (b = String(y), E) {
          let z = p - b.length;
          if (z > 0) {
            let $ = new Array(z + 1).join("0");
            y < 0 ? b = "-" + $ + b.slice(1) : b = $ + b;
          }
        }
        d.push(b);
      }
    } else {
      d = [];
      for (let f = 0; f < c.length; f++) d.push.apply(d, ht(c[f], t, false));
    }
    for (let f = 0; f < d.length; f++) for (let m = 0; m < o.length && s.length < t; m++) {
      let p = r + d[f] + o[m];
      (!e || l || p) && s.push(p);
    }
  }
  return s;
}
var at = (n7) => {
  if (typeof n7 != "string") throw new TypeError("invalid pattern");
  if (n7.length > 65536) throw new TypeError("pattern is too long");
};
var Ss = { "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true], "[:alpha:]": ["\\p{L}\\p{Nl}", true], "[:ascii:]": ["\\x00-\\x7f", false], "[:blank:]": ["\\p{Zs}\\t", true], "[:cntrl:]": ["\\p{Cc}", true], "[:digit:]": ["\\p{Nd}", true], "[:graph:]": ["\\p{Z}\\p{C}", true, true], "[:lower:]": ["\\p{Ll}", true], "[:print:]": ["\\p{C}", true], "[:punct:]": ["\\p{P}", true], "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true], "[:upper:]": ["\\p{Lu}", true], "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true], "[:xdigit:]": ["A-Fa-f0-9", false] };
var lt = (n7) => n7.replace(/[[\]\\-]/g, "\\$&");
var Es = (n7) => n7.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var we = (n7) => n7.join("");
var ye = (n7, t) => {
  let e = t;
  if (n7.charAt(e) !== "[") throw new Error("not in a brace expression");
  let s = [], i = [], r = e + 1, o = false, h = false, a = false, l = false, u = e, c = "";
  t: for (; r < n7.length; ) {
    let p = n7.charAt(r);
    if ((p === "!" || p === "^") && r === e + 1) {
      l = true, r++;
      continue;
    }
    if (p === "]" && o && !a) {
      u = r + 1;
      break;
    }
    if (o = true, p === "\\" && !a) {
      a = true, r++;
      continue;
    }
    if (p === "[" && !a) {
      for (let [w, [g, S, E]] of Object.entries(Ss)) if (n7.startsWith(w, r)) {
        if (c) return ["$.", false, n7.length - e, true];
        r += w.length, E ? i.push(g) : s.push(g), h = h || S;
        continue t;
      }
    }
    if (a = false, c) {
      p > c ? s.push(lt(c) + "-" + lt(p)) : p === c && s.push(lt(p)), c = "", r++;
      continue;
    }
    if (n7.startsWith("-]", r + 1)) {
      s.push(lt(p + "-")), r += 2;
      continue;
    }
    if (n7.startsWith("-", r + 1)) {
      c = p, r += 2;
      continue;
    }
    s.push(lt(p)), r++;
  }
  if (u < r) return ["", false, 0, false];
  if (!s.length && !i.length) return ["$.", false, n7.length - e, true];
  if (i.length === 0 && s.length === 1 && /^\\?.$/.test(s[0]) && !l) {
    let p = s[0].length === 2 ? s[0].slice(-1) : s[0];
    return [Es(p), false, u - e, false];
  }
  let d = "[" + (l ? "^" : "") + we(s) + "]", f = "[" + (l ? "" : "^") + we(i) + "]";
  return [s.length && i.length ? "(" + d + "|" + f + ")" : s.length ? d : f, h, u - e, true];
};
var W = (n7, { windowsPathsNoEscape: t = false, magicalBraces: e = true } = {}) => e ? t ? n7.replace(/\[([^\/\\])\]/g, "$1") : n7.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1") : t ? n7.replace(/\[([^\/\\{}])\]/g, "$1") : n7.replace(/((?!\\).|^)\[([^\/\\{}])\]/g, "$1$2").replace(/\\([^\/{}])/g, "$1");
var xs = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var be = (n7) => xs.has(n7);
var vs = "(?!(?:^|/)\\.\\.?(?:$|/))";
var Ct = "(?!\\.)";
var Cs = /* @__PURE__ */ new Set(["[", "."]);
var Ts = /* @__PURE__ */ new Set(["..", "."]);
var As = new Set("().*{}+?[]^$\\!");
var ks = (n7) => n7.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Kt = "[^/]";
var Se = Kt + "*?";
var Ee = Kt + "+?";
var Q = class n {
  type;
  #t;
  #s;
  #n = false;
  #r = [];
  #o;
  #S;
  #w;
  #c = false;
  #h;
  #u;
  #f = false;
  constructor(t, e, s = {}) {
    this.type = t, t && (this.#s = true), this.#o = e, this.#t = this.#o ? this.#o.#t : this, this.#h = this.#t === this ? s : this.#t.#h, this.#w = this.#t === this ? [] : this.#t.#w, t === "!" && !this.#t.#c && this.#w.push(this), this.#S = this.#o ? this.#o.#r.length : 0;
  }
  get hasMagic() {
    if (this.#s !== void 0) return this.#s;
    for (let t of this.#r) if (typeof t != "string" && (t.type || t.hasMagic)) return this.#s = true;
    return this.#s;
  }
  toString() {
    return this.#u !== void 0 ? this.#u : this.type ? this.#u = this.type + "(" + this.#r.map((t) => String(t)).join("|") + ")" : this.#u = this.#r.map((t) => String(t)).join("");
  }
  #a() {
    if (this !== this.#t) throw new Error("should only call on root");
    if (this.#c) return this;
    this.toString(), this.#c = true;
    let t;
    for (; t = this.#w.pop(); ) {
      if (t.type !== "!") continue;
      let e = t, s = e.#o;
      for (; s; ) {
        for (let i = e.#S + 1; !s.type && i < s.#r.length; i++) for (let r of t.#r) {
          if (typeof r == "string") throw new Error("string part in extglob AST??");
          r.copyIn(s.#r[i]);
        }
        e = s, s = e.#o;
      }
    }
    return this;
  }
  push(...t) {
    for (let e of t) if (e !== "") {
      if (typeof e != "string" && !(e instanceof n && e.#o === this)) throw new Error("invalid part: " + e);
      this.#r.push(e);
    }
  }
  toJSON() {
    let t = this.type === null ? this.#r.slice().map((e) => typeof e == "string" ? e : e.toJSON()) : [this.type, ...this.#r.map((e) => e.toJSON())];
    return this.isStart() && !this.type && t.unshift([]), this.isEnd() && (this === this.#t || this.#t.#c && this.#o?.type === "!") && t.push({}), t;
  }
  isStart() {
    if (this.#t === this) return true;
    if (!this.#o?.isStart()) return false;
    if (this.#S === 0) return true;
    let t = this.#o;
    for (let e = 0; e < this.#S; e++) {
      let s = t.#r[e];
      if (!(s instanceof n && s.type === "!")) return false;
    }
    return true;
  }
  isEnd() {
    if (this.#t === this || this.#o?.type === "!") return true;
    if (!this.#o?.isEnd()) return false;
    if (!this.type) return this.#o?.isEnd();
    let t = this.#o ? this.#o.#r.length : 0;
    return this.#S === t - 1;
  }
  copyIn(t) {
    typeof t == "string" ? this.push(t) : this.push(t.clone(this));
  }
  clone(t) {
    let e = new n(this.type, t);
    for (let s of this.#r) e.copyIn(s);
    return e;
  }
  static #i(t, e, s, i) {
    let r = false, o = false, h = -1, a = false;
    if (e.type === null) {
      let f = s, m = "";
      for (; f < t.length; ) {
        let p = t.charAt(f++);
        if (r || p === "\\") {
          r = !r, m += p;
          continue;
        }
        if (o) {
          f === h + 1 ? (p === "^" || p === "!") && (a = true) : p === "]" && !(f === h + 2 && a) && (o = false), m += p;
          continue;
        } else if (p === "[") {
          o = true, h = f, a = false, m += p;
          continue;
        }
        if (!i.noext && be(p) && t.charAt(f) === "(") {
          e.push(m), m = "";
          let w = new n(p, e);
          f = n.#i(t, w, f, i), e.push(w);
          continue;
        }
        m += p;
      }
      return e.push(m), f;
    }
    let l = s + 1, u = new n(null, e), c = [], d = "";
    for (; l < t.length; ) {
      let f = t.charAt(l++);
      if (r || f === "\\") {
        r = !r, d += f;
        continue;
      }
      if (o) {
        l === h + 1 ? (f === "^" || f === "!") && (a = true) : f === "]" && !(l === h + 2 && a) && (o = false), d += f;
        continue;
      } else if (f === "[") {
        o = true, h = l, a = false, d += f;
        continue;
      }
      if (be(f) && t.charAt(l) === "(") {
        u.push(d), d = "";
        let m = new n(f, u);
        u.push(m), l = n.#i(t, m, l, i);
        continue;
      }
      if (f === "|") {
        u.push(d), d = "", c.push(u), u = new n(null, e);
        continue;
      }
      if (f === ")") return d === "" && e.#r.length === 0 && (e.#f = true), u.push(d), d = "", e.push(...c, u), l;
      d += f;
    }
    return e.type = null, e.#s = void 0, e.#r = [t.substring(s - 1)], l;
  }
  static fromGlob(t, e = {}) {
    let s = new n(null, void 0, e);
    return n.#i(t, s, 0, e), s;
  }
  toMMPattern() {
    if (this !== this.#t) return this.#t.toMMPattern();
    let t = this.toString(), [e, s, i, r] = this.toRegExpSource();
    if (!(i || this.#s || this.#h.nocase && !this.#h.nocaseMagicOnly && t.toUpperCase() !== t.toLowerCase())) return s;
    let h = (this.#h.nocase ? "i" : "") + (r ? "u" : "");
    return Object.assign(new RegExp(`^${e}$`, h), { _src: e, _glob: t });
  }
  get options() {
    return this.#h;
  }
  toRegExpSource(t) {
    let e = t ?? !!this.#h.dot;
    if (this.#t === this && this.#a(), !this.type) {
      let a = this.isStart() && this.isEnd() && !this.#r.some((f) => typeof f != "string"), l = this.#r.map((f) => {
        let [m, p, w, g] = typeof f == "string" ? n.#E(f, this.#s, a) : f.toRegExpSource(t);
        return this.#s = this.#s || w, this.#n = this.#n || g, m;
      }).join(""), u = "";
      if (this.isStart() && typeof this.#r[0] == "string" && !(this.#r.length === 1 && Ts.has(this.#r[0]))) {
        let m = Cs, p = e && m.has(l.charAt(0)) || l.startsWith("\\.") && m.has(l.charAt(2)) || l.startsWith("\\.\\.") && m.has(l.charAt(4)), w = !e && !t && m.has(l.charAt(0));
        u = p ? vs : w ? Ct : "";
      }
      let c = "";
      return this.isEnd() && this.#t.#c && this.#o?.type === "!" && (c = "(?:$|\\/)"), [u + l + c, W(l), this.#s = !!this.#s, this.#n];
    }
    let s = this.type === "*" || this.type === "+", i = this.type === "!" ? "(?:(?!(?:" : "(?:", r = this.#d(e);
    if (this.isStart() && this.isEnd() && !r && this.type !== "!") {
      let a = this.toString();
      return this.#r = [a], this.type = null, this.#s = void 0, [a, W(this.toString()), false, false];
    }
    let o = !s || t || e || !Ct ? "" : this.#d(true);
    o === r && (o = ""), o && (r = `(?:${r})(?:${o})*?`);
    let h = "";
    if (this.type === "!" && this.#f) h = (this.isStart() && !e ? Ct : "") + Ee;
    else {
      let a = this.type === "!" ? "))" + (this.isStart() && !e && !t ? Ct : "") + Se + ")" : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && o ? ")" : this.type === "*" && o ? ")?" : `)${this.type}`;
      h = i + r + a;
    }
    return [h, W(r), this.#s = !!this.#s, this.#n];
  }
  #d(t) {
    return this.#r.map((e) => {
      if (typeof e == "string") throw new Error("string type in extglob ast??");
      let [s, i, r, o] = e.toRegExpSource(t);
      return this.#n = this.#n || o, s;
    }).filter((e) => !(this.isStart() && this.isEnd()) || !!e).join("|");
  }
  static #E(t, e, s = false) {
    let i = false, r = "", o = false, h = false;
    for (let a = 0; a < t.length; a++) {
      let l = t.charAt(a);
      if (i) {
        i = false, r += (As.has(l) ? "\\" : "") + l;
        continue;
      }
      if (l === "*") {
        if (h) continue;
        h = true, r += s && /^[*]+$/.test(t) ? Ee : Se, e = true;
        continue;
      } else h = false;
      if (l === "\\") {
        a === t.length - 1 ? r += "\\\\" : i = true;
        continue;
      }
      if (l === "[") {
        let [u, c, d, f] = ye(t, a);
        if (d) {
          r += u, o = o || c, a += d - 1, e = e || f;
          continue;
        }
      }
      if (l === "?") {
        r += Kt, e = true;
        continue;
      }
      r += ks(l);
    }
    return [r, W(t), !!e, o];
  }
};
var tt = (n7, { windowsPathsNoEscape: t = false, magicalBraces: e = false } = {}) => e ? t ? n7.replace(/[?*()[\]{}]/g, "[$&]") : n7.replace(/[?*()[\]\\{}]/g, "\\$&") : t ? n7.replace(/[?*()[\]]/g, "[$&]") : n7.replace(/[?*()[\]\\]/g, "\\$&");
var O = (n7, t, e = {}) => (at(t), !e.nocomment && t.charAt(0) === "#" ? false : new D(t, e).match(n7));
var Rs = /^\*+([^+@!?\*\[\(]*)$/;
var Os = (n7) => (t) => !t.startsWith(".") && t.endsWith(n7);
var Fs = (n7) => (t) => t.endsWith(n7);
var Ds = (n7) => (n7 = n7.toLowerCase(), (t) => !t.startsWith(".") && t.toLowerCase().endsWith(n7));
var Ms = (n7) => (n7 = n7.toLowerCase(), (t) => t.toLowerCase().endsWith(n7));
var Ns = /^\*+\.\*+$/;
var _s = (n7) => !n7.startsWith(".") && n7.includes(".");
var Ls = (n7) => n7 !== "." && n7 !== ".." && n7.includes(".");
var Ws = /^\.\*+$/;
var Ps = (n7) => n7 !== "." && n7 !== ".." && n7.startsWith(".");
var js = /^\*+$/;
var Is = (n7) => n7.length !== 0 && !n7.startsWith(".");
var zs = (n7) => n7.length !== 0 && n7 !== "." && n7 !== "..";
var Bs = /^\?+([^+@!?\*\[\(]*)?$/;
var Us = ([n7, t = ""]) => {
  let e = Ce([n7]);
  return t ? (t = t.toLowerCase(), (s) => e(s) && s.toLowerCase().endsWith(t)) : e;
};
var $s = ([n7, t = ""]) => {
  let e = Te([n7]);
  return t ? (t = t.toLowerCase(), (s) => e(s) && s.toLowerCase().endsWith(t)) : e;
};
var Gs = ([n7, t = ""]) => {
  let e = Te([n7]);
  return t ? (s) => e(s) && s.endsWith(t) : e;
};
var Hs = ([n7, t = ""]) => {
  let e = Ce([n7]);
  return t ? (s) => e(s) && s.endsWith(t) : e;
};
var Ce = ([n7]) => {
  let t = n7.length;
  return (e) => e.length === t && !e.startsWith(".");
};
var Te = ([n7]) => {
  let t = n7.length;
  return (e) => e.length === t && e !== "." && e !== "..";
};
var Ae = typeof process == "object" && process ? typeof process.env == "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var xe = { win32: { sep: "\\" }, posix: { sep: "/" } };
var qs = Ae === "win32" ? xe.win32.sep : xe.posix.sep;
O.sep = qs;
var A = /* @__PURE__ */ Symbol("globstar **");
O.GLOBSTAR = A;
var Ks = "[^/]";
var Vs = Ks + "*?";
var Ys = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var Xs = "(?:(?!(?:\\/|^)\\.).)*?";
var Js = (n7, t = {}) => (e) => O(e, n7, t);
O.filter = Js;
var N = (n7, t = {}) => Object.assign({}, n7, t);
var Zs = (n7) => {
  if (!n7 || typeof n7 != "object" || !Object.keys(n7).length) return O;
  let t = O;
  return Object.assign((s, i, r = {}) => t(s, i, N(n7, r)), { Minimatch: class extends t.Minimatch {
    constructor(i, r = {}) {
      super(i, N(n7, r));
    }
    static defaults(i) {
      return t.defaults(N(n7, i)).Minimatch;
    }
  }, AST: class extends t.AST {
    constructor(i, r, o = {}) {
      super(i, r, N(n7, o));
    }
    static fromGlob(i, r = {}) {
      return t.AST.fromGlob(i, N(n7, r));
    }
  }, unescape: (s, i = {}) => t.unescape(s, N(n7, i)), escape: (s, i = {}) => t.escape(s, N(n7, i)), filter: (s, i = {}) => t.filter(s, N(n7, i)), defaults: (s) => t.defaults(N(n7, s)), makeRe: (s, i = {}) => t.makeRe(s, N(n7, i)), braceExpand: (s, i = {}) => t.braceExpand(s, N(n7, i)), match: (s, i, r = {}) => t.match(s, i, N(n7, r)), sep: t.sep, GLOBSTAR: A });
};
O.defaults = Zs;
var ke = (n7, t = {}) => (at(n7), t.nobrace || !/\{(?:(?!\{).)*\}/.test(n7) ? [n7] : ge(n7, { max: t.braceExpandMax }));
O.braceExpand = ke;
var Qs = (n7, t = {}) => new D(n7, t).makeRe();
O.makeRe = Qs;
var ti = (n7, t, e = {}) => {
  let s = new D(t, e);
  return n7 = n7.filter((i) => s.match(i)), s.options.nonull && !n7.length && n7.push(t), n7;
};
O.match = ti;
var ve = /[?*]|[+@!]\(.*?\)|\[|\]/;
var ei = (n7) => n7.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var D = class {
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
  constructor(t, e = {}) {
    at(t), e = e || {}, this.options = e, this.pattern = t, this.platform = e.platform || Ae, this.isWindows = this.platform === "win32";
    let s = "allowWindowsEscape";
    this.windowsPathsNoEscape = !!e.windowsPathsNoEscape || e[s] === false, this.windowsPathsNoEscape && (this.pattern = this.pattern.replace(/\\/g, "/")), this.preserveMultipleSlashes = !!e.preserveMultipleSlashes, this.regexp = null, this.negate = false, this.nonegate = !!e.nonegate, this.comment = false, this.empty = false, this.partial = !!e.partial, this.nocase = !!this.options.nocase, this.windowsNoMagicRoot = e.windowsNoMagicRoot !== void 0 ? e.windowsNoMagicRoot : !!(this.isWindows && this.nocase), this.globSet = [], this.globParts = [], this.set = [], this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) return true;
    for (let t of this.set) for (let e of t) if (typeof e != "string") return true;
    return false;
  }
  debug(...t) {
  }
  make() {
    let t = this.pattern, e = this.options;
    if (!e.nocomment && t.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!t) {
      this.empty = true;
      return;
    }
    this.parseNegate(), this.globSet = [...new Set(this.braceExpand())], e.debug && (this.debug = (...r) => console.error(...r)), this.debug(this.pattern, this.globSet);
    let s = this.globSet.map((r) => this.slashSplit(r));
    this.globParts = this.preprocess(s), this.debug(this.pattern, this.globParts);
    let i = this.globParts.map((r, o, h) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        let a = r[0] === "" && r[1] === "" && (r[2] === "?" || !ve.test(r[2])) && !ve.test(r[3]), l = /^[a-z]:/i.test(r[0]);
        if (a) return [...r.slice(0, 4), ...r.slice(4).map((u) => this.parse(u))];
        if (l) return [r[0], ...r.slice(1).map((u) => this.parse(u))];
      }
      return r.map((a) => this.parse(a));
    });
    if (this.debug(this.pattern, i), this.set = i.filter((r) => r.indexOf(false) === -1), this.isWindows) for (let r = 0; r < this.set.length; r++) {
      let o = this.set[r];
      o[0] === "" && o[1] === "" && this.globParts[r][2] === "?" && typeof o[3] == "string" && /^[a-z]:$/i.test(o[3]) && (o[2] = "?");
    }
    this.debug(this.pattern, this.set);
  }
  preprocess(t) {
    if (this.options.noglobstar) for (let s = 0; s < t.length; s++) for (let i = 0; i < t[s].length; i++) t[s][i] === "**" && (t[s][i] = "*");
    let { optimizationLevel: e = 1 } = this.options;
    return e >= 2 ? (t = this.firstPhasePreProcess(t), t = this.secondPhasePreProcess(t)) : e >= 1 ? t = this.levelOneOptimize(t) : t = this.adjascentGlobstarOptimize(t), t;
  }
  adjascentGlobstarOptimize(t) {
    return t.map((e) => {
      let s = -1;
      for (; (s = e.indexOf("**", s + 1)) !== -1; ) {
        let i = s;
        for (; e[i + 1] === "**"; ) i++;
        i !== s && e.splice(s, i - s);
      }
      return e;
    });
  }
  levelOneOptimize(t) {
    return t.map((e) => (e = e.reduce((s, i) => {
      let r = s[s.length - 1];
      return i === "**" && r === "**" ? s : i === ".." && r && r !== ".." && r !== "." && r !== "**" ? (s.pop(), s) : (s.push(i), s);
    }, []), e.length === 0 ? [""] : e));
  }
  levelTwoFileOptimize(t) {
    Array.isArray(t) || (t = this.slashSplit(t));
    let e = false;
    do {
      if (e = false, !this.preserveMultipleSlashes) {
        for (let i = 1; i < t.length - 1; i++) {
          let r = t[i];
          i === 1 && r === "" && t[0] === "" || (r === "." || r === "") && (e = true, t.splice(i, 1), i--);
        }
        t[0] === "." && t.length === 2 && (t[1] === "." || t[1] === "") && (e = true, t.pop());
      }
      let s = 0;
      for (; (s = t.indexOf("..", s + 1)) !== -1; ) {
        let i = t[s - 1];
        i && i !== "." && i !== ".." && i !== "**" && (e = true, t.splice(s - 1, 2), s -= 2);
      }
    } while (e);
    return t.length === 0 ? [""] : t;
  }
  firstPhasePreProcess(t) {
    let e = false;
    do {
      e = false;
      for (let s of t) {
        let i = -1;
        for (; (i = s.indexOf("**", i + 1)) !== -1; ) {
          let o = i;
          for (; s[o + 1] === "**"; ) o++;
          o > i && s.splice(i + 1, o - i);
          let h = s[i + 1], a = s[i + 2], l = s[i + 3];
          if (h !== ".." || !a || a === "." || a === ".." || !l || l === "." || l === "..") continue;
          e = true, s.splice(i, 1);
          let u = s.slice(0);
          u[i] = "**", t.push(u), i--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let o = 1; o < s.length - 1; o++) {
            let h = s[o];
            o === 1 && h === "" && s[0] === "" || (h === "." || h === "") && (e = true, s.splice(o, 1), o--);
          }
          s[0] === "." && s.length === 2 && (s[1] === "." || s[1] === "") && (e = true, s.pop());
        }
        let r = 0;
        for (; (r = s.indexOf("..", r + 1)) !== -1; ) {
          let o = s[r - 1];
          if (o && o !== "." && o !== ".." && o !== "**") {
            e = true;
            let a = r === 1 && s[r + 1] === "**" ? ["."] : [];
            s.splice(r - 1, 2, ...a), s.length === 0 && s.push(""), r -= 2;
          }
        }
      }
    } while (e);
    return t;
  }
  secondPhasePreProcess(t) {
    for (let e = 0; e < t.length - 1; e++) for (let s = e + 1; s < t.length; s++) {
      let i = this.partsMatch(t[e], t[s], !this.preserveMultipleSlashes);
      if (i) {
        t[e] = [], t[s] = i;
        break;
      }
    }
    return t.filter((e) => e.length);
  }
  partsMatch(t, e, s = false) {
    let i = 0, r = 0, o = [], h = "";
    for (; i < t.length && r < e.length; ) if (t[i] === e[r]) o.push(h === "b" ? e[r] : t[i]), i++, r++;
    else if (s && t[i] === "**" && e[r] === t[i + 1]) o.push(t[i]), i++;
    else if (s && e[r] === "**" && t[i] === e[r + 1]) o.push(e[r]), r++;
    else if (t[i] === "*" && e[r] && (this.options.dot || !e[r].startsWith(".")) && e[r] !== "**") {
      if (h === "b") return false;
      h = "a", o.push(t[i]), i++, r++;
    } else if (e[r] === "*" && t[i] && (this.options.dot || !t[i].startsWith(".")) && t[i] !== "**") {
      if (h === "a") return false;
      h = "b", o.push(e[r]), i++, r++;
    } else return false;
    return t.length === e.length && o;
  }
  parseNegate() {
    if (this.nonegate) return;
    let t = this.pattern, e = false, s = 0;
    for (let i = 0; i < t.length && t.charAt(i) === "!"; i++) e = !e, s++;
    s && (this.pattern = t.slice(s)), this.negate = e;
  }
  matchOne(t, e, s = false) {
    let i = this.options;
    if (this.isWindows) {
      let p = typeof t[0] == "string" && /^[a-z]:$/i.test(t[0]), w = !p && t[0] === "" && t[1] === "" && t[2] === "?" && /^[a-z]:$/i.test(t[3]), g = typeof e[0] == "string" && /^[a-z]:$/i.test(e[0]), S = !g && e[0] === "" && e[1] === "" && e[2] === "?" && typeof e[3] == "string" && /^[a-z]:$/i.test(e[3]), E = w ? 3 : p ? 0 : void 0, y = S ? 3 : g ? 0 : void 0;
      if (typeof E == "number" && typeof y == "number") {
        let [b, z] = [t[E], e[y]];
        b.toLowerCase() === z.toLowerCase() && (e[y] = b, y > E ? e = e.slice(y) : E > y && (t = t.slice(E)));
      }
    }
    let { optimizationLevel: r = 1 } = this.options;
    r >= 2 && (t = this.levelTwoFileOptimize(t)), this.debug("matchOne", this, { file: t, pattern: e }), this.debug("matchOne", t.length, e.length);
    for (var o = 0, h = 0, a = t.length, l = e.length; o < a && h < l; o++, h++) {
      this.debug("matchOne loop");
      var u = e[h], c = t[o];
      if (this.debug(e, u, c), u === false) return false;
      if (u === A) {
        this.debug("GLOBSTAR", [e, u, c]);
        var d = o, f = h + 1;
        if (f === l) {
          for (this.debug("** at the end"); o < a; o++) if (t[o] === "." || t[o] === ".." || !i.dot && t[o].charAt(0) === ".") return false;
          return true;
        }
        for (; d < a; ) {
          var m = t[d];
          if (this.debug(`
globstar while`, t, d, e, f, m), this.matchOne(t.slice(d), e.slice(f), s)) return this.debug("globstar found match!", d, a, m), true;
          if (m === "." || m === ".." || !i.dot && m.charAt(0) === ".") {
            this.debug("dot detected!", t, d, e, f);
            break;
          }
          this.debug("globstar swallow a segment, and continue"), d++;
        }
        return !!(s && (this.debug(`
>>> no match, partial?`, t, d, e, f), d === a));
      }
      let p;
      if (typeof u == "string" ? (p = c === u, this.debug("string match", u, c, p)) : (p = u.test(c), this.debug("pattern match", u, c, p)), !p) return false;
    }
    if (o === a && h === l) return true;
    if (o === a) return s;
    if (h === l) return o === a - 1 && t[o] === "";
    throw new Error("wtf?");
  }
  braceExpand() {
    return ke(this.pattern, this.options);
  }
  parse(t) {
    at(t);
    let e = this.options;
    if (t === "**") return A;
    if (t === "") return "";
    let s, i = null;
    (s = t.match(js)) ? i = e.dot ? zs : Is : (s = t.match(Rs)) ? i = (e.nocase ? e.dot ? Ms : Ds : e.dot ? Fs : Os)(s[1]) : (s = t.match(Bs)) ? i = (e.nocase ? e.dot ? $s : Us : e.dot ? Gs : Hs)(s) : (s = t.match(Ns)) ? i = e.dot ? Ls : _s : (s = t.match(Ws)) && (i = Ps);
    let r = Q.fromGlob(t, this.options).toMMPattern();
    return i && typeof r == "object" && Reflect.defineProperty(r, "test", { value: i }), r;
  }
  makeRe() {
    if (this.regexp || this.regexp === false) return this.regexp;
    let t = this.set;
    if (!t.length) return this.regexp = false, this.regexp;
    let e = this.options, s = e.noglobstar ? Vs : e.dot ? Ys : Xs, i = new Set(e.nocase ? ["i"] : []), r = t.map((a) => {
      let l = a.map((c) => {
        if (c instanceof RegExp) for (let d of c.flags.split("")) i.add(d);
        return typeof c == "string" ? ei(c) : c === A ? A : c._src;
      });
      l.forEach((c, d) => {
        let f = l[d + 1], m = l[d - 1];
        c !== A || m === A || (m === void 0 ? f !== void 0 && f !== A ? l[d + 1] = "(?:\\/|" + s + "\\/)?" + f : l[d] = s : f === void 0 ? l[d - 1] = m + "(?:\\/|\\/" + s + ")?" : f !== A && (l[d - 1] = m + "(?:\\/|\\/" + s + "\\/)" + f, l[d + 1] = A));
      });
      let u = l.filter((c) => c !== A);
      if (this.partial && u.length >= 1) {
        let c = [];
        for (let d = 1; d <= u.length; d++) c.push(u.slice(0, d).join("/"));
        return "(?:" + c.join("|") + ")";
      }
      return u.join("/");
    }).join("|"), [o, h] = t.length > 1 ? ["(?:", ")"] : ["", ""];
    r = "^" + o + r + h + "$", this.partial && (r = "^(?:\\/|" + o + r.slice(1, -1) + h + ")$"), this.negate && (r = "^(?!" + r + ").+$");
    try {
      this.regexp = new RegExp(r, [...i].join(""));
    } catch {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(t) {
    return this.preserveMultipleSlashes ? t.split("/") : this.isWindows && /^\/\/[^\/]+/.test(t) ? ["", ...t.split(/\/+/)] : t.split(/\/+/);
  }
  match(t, e = this.partial) {
    if (this.debug("match", t, this.pattern), this.comment) return false;
    if (this.empty) return t === "";
    if (t === "/" && e) return true;
    let s = this.options;
    this.isWindows && (t = t.split("\\").join("/"));
    let i = this.slashSplit(t);
    this.debug(this.pattern, "split", i);
    let r = this.set;
    this.debug(this.pattern, "set", r);
    let o = i[i.length - 1];
    if (!o) for (let h = i.length - 2; !o && h >= 0; h--) o = i[h];
    for (let h = 0; h < r.length; h++) {
      let a = r[h], l = i;
      if (s.matchBase && a.length === 1 && (l = [o]), this.matchOne(l, a, e)) return s.flipNegate ? true : !this.negate;
    }
    return s.flipNegate ? false : this.negate;
  }
  static defaults(t) {
    return O.defaults(t).Minimatch;
  }
};
O.AST = Q;
O.Minimatch = D;
O.escape = tt;
O.unescape = W;
var si = typeof performance == "object" && performance && typeof performance.now == "function" ? performance : Date;
var Oe = /* @__PURE__ */ new Set();
var Vt = typeof process == "object" && process ? process : {};
var Fe = (n7, t, e, s) => {
  typeof Vt.emitWarning == "function" ? Vt.emitWarning(n7, t, e, s) : console.error(`[${e}] ${t}: ${n7}`);
};
var At = globalThis.AbortController;
var Re = globalThis.AbortSignal;
if (typeof At > "u") {
  Re = class {
    onabort;
    _onabort = [];
    reason;
    aborted = false;
    addEventListener(e, s) {
      this._onabort.push(s);
    }
  }, At = class {
    constructor() {
      t();
    }
    signal = new Re();
    abort(e) {
      if (!this.signal.aborted) {
        this.signal.reason = e, this.signal.aborted = true;
        for (let s of this.signal._onabort) s(e);
        this.signal.onabort?.(e);
      }
    }
  };
  let n7 = Vt.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1", t = () => {
    n7 && (n7 = false, Fe("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", t));
  };
}
var ii = (n7) => !Oe.has(n7);
var q = (n7) => n7 && n7 === Math.floor(n7) && n7 > 0 && isFinite(n7);
var De = (n7) => q(n7) ? n7 <= Math.pow(2, 8) ? Uint8Array : n7 <= Math.pow(2, 16) ? Uint16Array : n7 <= Math.pow(2, 32) ? Uint32Array : n7 <= Number.MAX_SAFE_INTEGER ? Tt : null : null;
var Tt = class extends Array {
  constructor(n7) {
    super(n7), this.fill(0);
  }
};
var ri = class ct {
  heap;
  length;
  static #t = false;
  static create(t) {
    let e = De(t);
    if (!e) return [];
    ct.#t = true;
    let s = new ct(t, e);
    return ct.#t = false, s;
  }
  constructor(t, e) {
    if (!ct.#t) throw new TypeError("instantiate Stack using Stack.create(n)");
    this.heap = new e(t), this.length = 0;
  }
  push(t) {
    this.heap[this.length++] = t;
  }
  pop() {
    return this.heap[--this.length];
  }
};
var ft = class Me {
  #t;
  #s;
  #n;
  #r;
  #o;
  #S;
  #w;
  #c;
  get perf() {
    return this.#c;
  }
  ttl;
  ttlResolution;
  ttlAutopurge;
  updateAgeOnGet;
  updateAgeOnHas;
  allowStale;
  noDisposeOnSet;
  noUpdateTTL;
  maxEntrySize;
  sizeCalculation;
  noDeleteOnFetchRejection;
  noDeleteOnStaleGet;
  allowStaleOnFetchAbort;
  allowStaleOnFetchRejection;
  ignoreFetchAbort;
  #h;
  #u;
  #f;
  #a;
  #i;
  #d;
  #E;
  #b;
  #p;
  #R;
  #m;
  #C;
  #T;
  #g;
  #y;
  #x;
  #A;
  #e;
  #_;
  static unsafeExposeInternals(t) {
    return { starts: t.#T, ttls: t.#g, autopurgeTimers: t.#y, sizes: t.#C, keyMap: t.#f, keyList: t.#a, valList: t.#i, next: t.#d, prev: t.#E, get head() {
      return t.#b;
    }, get tail() {
      return t.#p;
    }, free: t.#R, isBackgroundFetch: (e) => t.#l(e), backgroundFetch: (e, s, i, r) => t.#U(e, s, i, r), moveToTail: (e) => t.#W(e), indexes: (e) => t.#F(e), rindexes: (e) => t.#D(e), isStale: (e) => t.#v(e) };
  }
  get max() {
    return this.#t;
  }
  get maxSize() {
    return this.#s;
  }
  get calculatedSize() {
    return this.#u;
  }
  get size() {
    return this.#h;
  }
  get fetchMethod() {
    return this.#S;
  }
  get memoMethod() {
    return this.#w;
  }
  get dispose() {
    return this.#n;
  }
  get onInsert() {
    return this.#r;
  }
  get disposeAfter() {
    return this.#o;
  }
  constructor(t) {
    let { max: e = 0, ttl: s, ttlResolution: i = 1, ttlAutopurge: r, updateAgeOnGet: o, updateAgeOnHas: h, allowStale: a, dispose: l, onInsert: u, disposeAfter: c, noDisposeOnSet: d, noUpdateTTL: f, maxSize: m = 0, maxEntrySize: p = 0, sizeCalculation: w, fetchMethod: g, memoMethod: S, noDeleteOnFetchRejection: E, noDeleteOnStaleGet: y, allowStaleOnFetchRejection: b, allowStaleOnFetchAbort: z, ignoreFetchAbort: $, perf: J } = t;
    if (J !== void 0 && typeof J?.now != "function") throw new TypeError("perf option must have a now() method if specified");
    if (this.#c = J ?? si, e !== 0 && !q(e)) throw new TypeError("max option must be a nonnegative integer");
    let Z = e ? De(e) : Array;
    if (!Z) throw new Error("invalid max value: " + e);
    if (this.#t = e, this.#s = m, this.maxEntrySize = p || this.#s, this.sizeCalculation = w, this.sizeCalculation) {
      if (!this.#s && !this.maxEntrySize) throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      if (typeof this.sizeCalculation != "function") throw new TypeError("sizeCalculation set to non-function");
    }
    if (S !== void 0 && typeof S != "function") throw new TypeError("memoMethod must be a function if defined");
    if (this.#w = S, g !== void 0 && typeof g != "function") throw new TypeError("fetchMethod must be a function if specified");
    if (this.#S = g, this.#A = !!g, this.#f = /* @__PURE__ */ new Map(), this.#a = new Array(e).fill(void 0), this.#i = new Array(e).fill(void 0), this.#d = new Z(e), this.#E = new Z(e), this.#b = 0, this.#p = 0, this.#R = ri.create(e), this.#h = 0, this.#u = 0, typeof l == "function" && (this.#n = l), typeof u == "function" && (this.#r = u), typeof c == "function" ? (this.#o = c, this.#m = []) : (this.#o = void 0, this.#m = void 0), this.#x = !!this.#n, this.#_ = !!this.#r, this.#e = !!this.#o, this.noDisposeOnSet = !!d, this.noUpdateTTL = !!f, this.noDeleteOnFetchRejection = !!E, this.allowStaleOnFetchRejection = !!b, this.allowStaleOnFetchAbort = !!z, this.ignoreFetchAbort = !!$, this.maxEntrySize !== 0) {
      if (this.#s !== 0 && !q(this.#s)) throw new TypeError("maxSize must be a positive integer if specified");
      if (!q(this.maxEntrySize)) throw new TypeError("maxEntrySize must be a positive integer if specified");
      this.#G();
    }
    if (this.allowStale = !!a, this.noDeleteOnStaleGet = !!y, this.updateAgeOnGet = !!o, this.updateAgeOnHas = !!h, this.ttlResolution = q(i) || i === 0 ? i : 1, this.ttlAutopurge = !!r, this.ttl = s || 0, this.ttl) {
      if (!q(this.ttl)) throw new TypeError("ttl must be a positive integer if specified");
      this.#M();
    }
    if (this.#t === 0 && this.ttl === 0 && this.#s === 0) throw new TypeError("At least one of max, maxSize, or ttl is required");
    if (!this.ttlAutopurge && !this.#t && !this.#s) {
      let $t = "LRU_CACHE_UNBOUNDED";
      ii($t) && (Oe.add($t), Fe("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedCacheWarning", $t, Me));
    }
  }
  getRemainingTTL(t) {
    return this.#f.has(t) ? 1 / 0 : 0;
  }
  #M() {
    let t = new Tt(this.#t), e = new Tt(this.#t);
    this.#g = t, this.#T = e;
    let s = this.ttlAutopurge ? new Array(this.#t) : void 0;
    this.#y = s, this.#j = (o, h, a = this.#c.now()) => {
      if (e[o] = h !== 0 ? a : 0, t[o] = h, s?.[o] && (clearTimeout(s[o]), s[o] = void 0), h !== 0 && s) {
        let l = setTimeout(() => {
          this.#v(o) && this.#O(this.#a[o], "expire");
        }, h + 1);
        l.unref && l.unref(), s[o] = l;
      }
    }, this.#k = (o) => {
      e[o] = t[o] !== 0 ? this.#c.now() : 0;
    }, this.#N = (o, h) => {
      if (t[h]) {
        let a = t[h], l = e[h];
        if (!a || !l) return;
        o.ttl = a, o.start = l, o.now = i || r();
        let u = o.now - l;
        o.remainingTTL = a - u;
      }
    };
    let i = 0, r = () => {
      let o = this.#c.now();
      if (this.ttlResolution > 0) {
        i = o;
        let h = setTimeout(() => i = 0, this.ttlResolution);
        h.unref && h.unref();
      }
      return o;
    };
    this.getRemainingTTL = (o) => {
      let h = this.#f.get(o);
      if (h === void 0) return 0;
      let a = t[h], l = e[h];
      if (!a || !l) return 1 / 0;
      let u = (i || r()) - l;
      return a - u;
    }, this.#v = (o) => {
      let h = e[o], a = t[o];
      return !!a && !!h && (i || r()) - h > a;
    };
  }
  #k = () => {
  };
  #N = () => {
  };
  #j = () => {
  };
  #v = () => false;
  #G() {
    let t = new Tt(this.#t);
    this.#u = 0, this.#C = t, this.#P = (e) => {
      this.#u -= t[e], t[e] = 0;
    }, this.#I = (e, s, i, r) => {
      if (this.#l(s)) return 0;
      if (!q(i)) if (r) {
        if (typeof r != "function") throw new TypeError("sizeCalculation must be a function");
        if (i = r(s, e), !q(i)) throw new TypeError("sizeCalculation return invalid (expect positive integer)");
      } else throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
      return i;
    }, this.#L = (e, s, i) => {
      if (t[e] = s, this.#s) {
        let r = this.#s - t[e];
        for (; this.#u > r; ) this.#B(true);
      }
      this.#u += t[e], i && (i.entrySize = s, i.totalCalculatedSize = this.#u);
    };
  }
  #P = (t) => {
  };
  #L = (t, e, s) => {
  };
  #I = (t, e, s, i) => {
    if (s || i) throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
    return 0;
  };
  *#F({ allowStale: t = this.allowStale } = {}) {
    if (this.#h) for (let e = this.#p; !(!this.#z(e) || ((t || !this.#v(e)) && (yield e), e === this.#b)); ) e = this.#E[e];
  }
  *#D({ allowStale: t = this.allowStale } = {}) {
    if (this.#h) for (let e = this.#b; !(!this.#z(e) || ((t || !this.#v(e)) && (yield e), e === this.#p)); ) e = this.#d[e];
  }
  #z(t) {
    return t !== void 0 && this.#f.get(this.#a[t]) === t;
  }
  *entries() {
    for (let t of this.#F()) this.#i[t] !== void 0 && this.#a[t] !== void 0 && !this.#l(this.#i[t]) && (yield [this.#a[t], this.#i[t]]);
  }
  *rentries() {
    for (let t of this.#D()) this.#i[t] !== void 0 && this.#a[t] !== void 0 && !this.#l(this.#i[t]) && (yield [this.#a[t], this.#i[t]]);
  }
  *keys() {
    for (let t of this.#F()) {
      let e = this.#a[t];
      e !== void 0 && !this.#l(this.#i[t]) && (yield e);
    }
  }
  *rkeys() {
    for (let t of this.#D()) {
      let e = this.#a[t];
      e !== void 0 && !this.#l(this.#i[t]) && (yield e);
    }
  }
  *values() {
    for (let t of this.#F()) this.#i[t] !== void 0 && !this.#l(this.#i[t]) && (yield this.#i[t]);
  }
  *rvalues() {
    for (let t of this.#D()) this.#i[t] !== void 0 && !this.#l(this.#i[t]) && (yield this.#i[t]);
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  [Symbol.toStringTag] = "LRUCache";
  find(t, e = {}) {
    for (let s of this.#F()) {
      let i = this.#i[s], r = this.#l(i) ? i.__staleWhileFetching : i;
      if (r !== void 0 && t(r, this.#a[s], this)) return this.get(this.#a[s], e);
    }
  }
  forEach(t, e = this) {
    for (let s of this.#F()) {
      let i = this.#i[s], r = this.#l(i) ? i.__staleWhileFetching : i;
      r !== void 0 && t.call(e, r, this.#a[s], this);
    }
  }
  rforEach(t, e = this) {
    for (let s of this.#D()) {
      let i = this.#i[s], r = this.#l(i) ? i.__staleWhileFetching : i;
      r !== void 0 && t.call(e, r, this.#a[s], this);
    }
  }
  purgeStale() {
    let t = false;
    for (let e of this.#D({ allowStale: true })) this.#v(e) && (this.#O(this.#a[e], "expire"), t = true);
    return t;
  }
  info(t) {
    let e = this.#f.get(t);
    if (e === void 0) return;
    let s = this.#i[e], i = this.#l(s) ? s.__staleWhileFetching : s;
    if (i === void 0) return;
    let r = { value: i };
    if (this.#g && this.#T) {
      let o = this.#g[e], h = this.#T[e];
      if (o && h) {
        let a = o - (this.#c.now() - h);
        r.ttl = a, r.start = Date.now();
      }
    }
    return this.#C && (r.size = this.#C[e]), r;
  }
  dump() {
    let t = [];
    for (let e of this.#F({ allowStale: true })) {
      let s = this.#a[e], i = this.#i[e], r = this.#l(i) ? i.__staleWhileFetching : i;
      if (r === void 0 || s === void 0) continue;
      let o = { value: r };
      if (this.#g && this.#T) {
        o.ttl = this.#g[e];
        let h = this.#c.now() - this.#T[e];
        o.start = Math.floor(Date.now() - h);
      }
      this.#C && (o.size = this.#C[e]), t.unshift([s, o]);
    }
    return t;
  }
  load(t) {
    this.clear();
    for (let [e, s] of t) {
      if (s.start) {
        let i = Date.now() - s.start;
        s.start = this.#c.now() - i;
      }
      this.set(e, s.value, s);
    }
  }
  set(t, e, s = {}) {
    if (e === void 0) return this.delete(t), this;
    let { ttl: i = this.ttl, start: r, noDisposeOnSet: o = this.noDisposeOnSet, sizeCalculation: h = this.sizeCalculation, status: a } = s, { noUpdateTTL: l = this.noUpdateTTL } = s, u = this.#I(t, e, s.size || 0, h);
    if (this.maxEntrySize && u > this.maxEntrySize) return a && (a.set = "miss", a.maxEntrySizeExceeded = true), this.#O(t, "set"), this;
    let c = this.#h === 0 ? void 0 : this.#f.get(t);
    if (c === void 0) c = this.#h === 0 ? this.#p : this.#R.length !== 0 ? this.#R.pop() : this.#h === this.#t ? this.#B(false) : this.#h, this.#a[c] = t, this.#i[c] = e, this.#f.set(t, c), this.#d[this.#p] = c, this.#E[c] = this.#p, this.#p = c, this.#h++, this.#L(c, u, a), a && (a.set = "add"), l = false, this.#_ && this.#r?.(e, t, "add");
    else {
      this.#W(c);
      let d = this.#i[c];
      if (e !== d) {
        if (this.#A && this.#l(d)) {
          d.__abortController.abort(new Error("replaced"));
          let { __staleWhileFetching: f } = d;
          f !== void 0 && !o && (this.#x && this.#n?.(f, t, "set"), this.#e && this.#m?.push([f, t, "set"]));
        } else o || (this.#x && this.#n?.(d, t, "set"), this.#e && this.#m?.push([d, t, "set"]));
        if (this.#P(c), this.#L(c, u, a), this.#i[c] = e, a) {
          a.set = "replace";
          let f = d && this.#l(d) ? d.__staleWhileFetching : d;
          f !== void 0 && (a.oldValue = f);
        }
      } else a && (a.set = "update");
      this.#_ && this.onInsert?.(e, t, e === d ? "update" : "replace");
    }
    if (i !== 0 && !this.#g && this.#M(), this.#g && (l || this.#j(c, i, r), a && this.#N(a, c)), !o && this.#e && this.#m) {
      let d = this.#m, f;
      for (; f = d?.shift(); ) this.#o?.(...f);
    }
    return this;
  }
  pop() {
    try {
      for (; this.#h; ) {
        let t = this.#i[this.#b];
        if (this.#B(true), this.#l(t)) {
          if (t.__staleWhileFetching) return t.__staleWhileFetching;
        } else if (t !== void 0) return t;
      }
    } finally {
      if (this.#e && this.#m) {
        let t = this.#m, e;
        for (; e = t?.shift(); ) this.#o?.(...e);
      }
    }
  }
  #B(t) {
    let e = this.#b, s = this.#a[e], i = this.#i[e];
    return this.#A && this.#l(i) ? i.__abortController.abort(new Error("evicted")) : (this.#x || this.#e) && (this.#x && this.#n?.(i, s, "evict"), this.#e && this.#m?.push([i, s, "evict"])), this.#P(e), this.#y?.[e] && (clearTimeout(this.#y[e]), this.#y[e] = void 0), t && (this.#a[e] = void 0, this.#i[e] = void 0, this.#R.push(e)), this.#h === 1 ? (this.#b = this.#p = 0, this.#R.length = 0) : this.#b = this.#d[e], this.#f.delete(s), this.#h--, e;
  }
  has(t, e = {}) {
    let { updateAgeOnHas: s = this.updateAgeOnHas, status: i } = e, r = this.#f.get(t);
    if (r !== void 0) {
      let o = this.#i[r];
      if (this.#l(o) && o.__staleWhileFetching === void 0) return false;
      if (this.#v(r)) i && (i.has = "stale", this.#N(i, r));
      else return s && this.#k(r), i && (i.has = "hit", this.#N(i, r)), true;
    } else i && (i.has = "miss");
    return false;
  }
  peek(t, e = {}) {
    let { allowStale: s = this.allowStale } = e, i = this.#f.get(t);
    if (i === void 0 || !s && this.#v(i)) return;
    let r = this.#i[i];
    return this.#l(r) ? r.__staleWhileFetching : r;
  }
  #U(t, e, s, i) {
    let r = e === void 0 ? void 0 : this.#i[e];
    if (this.#l(r)) return r;
    let o = new At(), { signal: h } = s;
    h?.addEventListener("abort", () => o.abort(h.reason), { signal: o.signal });
    let a = { signal: o.signal, options: s, context: i }, l = (p, w = false) => {
      let { aborted: g } = o.signal, S = s.ignoreFetchAbort && p !== void 0, E = s.ignoreFetchAbort || !!(s.allowStaleOnFetchAbort && p !== void 0);
      if (s.status && (g && !w ? (s.status.fetchAborted = true, s.status.fetchError = o.signal.reason, S && (s.status.fetchAbortIgnored = true)) : s.status.fetchResolved = true), g && !S && !w) return c(o.signal.reason, E);
      let y = f, b = this.#i[e];
      return (b === f || S && w && b === void 0) && (p === void 0 ? y.__staleWhileFetching !== void 0 ? this.#i[e] = y.__staleWhileFetching : this.#O(t, "fetch") : (s.status && (s.status.fetchUpdated = true), this.set(t, p, a.options))), p;
    }, u = (p) => (s.status && (s.status.fetchRejected = true, s.status.fetchError = p), c(p, false)), c = (p, w) => {
      let { aborted: g } = o.signal, S = g && s.allowStaleOnFetchAbort, E = S || s.allowStaleOnFetchRejection, y = E || s.noDeleteOnFetchRejection, b = f;
      if (this.#i[e] === f && (!y || !w && b.__staleWhileFetching === void 0 ? this.#O(t, "fetch") : S || (this.#i[e] = b.__staleWhileFetching)), E) return s.status && b.__staleWhileFetching !== void 0 && (s.status.returnedStale = true), b.__staleWhileFetching;
      if (b.__returned === b) throw p;
    }, d = (p, w) => {
      let g = this.#S?.(t, r, a);
      g && g instanceof Promise && g.then((S) => p(S === void 0 ? void 0 : S), w), o.signal.addEventListener("abort", () => {
        (!s.ignoreFetchAbort || s.allowStaleOnFetchAbort) && (p(void 0), s.allowStaleOnFetchAbort && (p = (S) => l(S, true)));
      });
    };
    s.status && (s.status.fetchDispatched = true);
    let f = new Promise(d).then(l, u), m = Object.assign(f, { __abortController: o, __staleWhileFetching: r, __returned: void 0 });
    return e === void 0 ? (this.set(t, m, { ...a.options, status: void 0 }), e = this.#f.get(t)) : this.#i[e] = m, m;
  }
  #l(t) {
    if (!this.#A) return false;
    let e = t;
    return !!e && e instanceof Promise && e.hasOwnProperty("__staleWhileFetching") && e.__abortController instanceof At;
  }
  async fetch(t, e = {}) {
    let { allowStale: s = this.allowStale, updateAgeOnGet: i = this.updateAgeOnGet, noDeleteOnStaleGet: r = this.noDeleteOnStaleGet, ttl: o = this.ttl, noDisposeOnSet: h = this.noDisposeOnSet, size: a = 0, sizeCalculation: l = this.sizeCalculation, noUpdateTTL: u = this.noUpdateTTL, noDeleteOnFetchRejection: c = this.noDeleteOnFetchRejection, allowStaleOnFetchRejection: d = this.allowStaleOnFetchRejection, ignoreFetchAbort: f = this.ignoreFetchAbort, allowStaleOnFetchAbort: m = this.allowStaleOnFetchAbort, context: p, forceRefresh: w = false, status: g, signal: S } = e;
    if (!this.#A) return g && (g.fetch = "get"), this.get(t, { allowStale: s, updateAgeOnGet: i, noDeleteOnStaleGet: r, status: g });
    let E = { allowStale: s, updateAgeOnGet: i, noDeleteOnStaleGet: r, ttl: o, noDisposeOnSet: h, size: a, sizeCalculation: l, noUpdateTTL: u, noDeleteOnFetchRejection: c, allowStaleOnFetchRejection: d, allowStaleOnFetchAbort: m, ignoreFetchAbort: f, status: g, signal: S }, y = this.#f.get(t);
    if (y === void 0) {
      g && (g.fetch = "miss");
      let b = this.#U(t, y, E, p);
      return b.__returned = b;
    } else {
      let b = this.#i[y];
      if (this.#l(b)) {
        let Z = s && b.__staleWhileFetching !== void 0;
        return g && (g.fetch = "inflight", Z && (g.returnedStale = true)), Z ? b.__staleWhileFetching : b.__returned = b;
      }
      let z = this.#v(y);
      if (!w && !z) return g && (g.fetch = "hit"), this.#W(y), i && this.#k(y), g && this.#N(g, y), b;
      let $ = this.#U(t, y, E, p), J = $.__staleWhileFetching !== void 0 && s;
      return g && (g.fetch = z ? "stale" : "refresh", J && z && (g.returnedStale = true)), J ? $.__staleWhileFetching : $.__returned = $;
    }
  }
  async forceFetch(t, e = {}) {
    let s = await this.fetch(t, e);
    if (s === void 0) throw new Error("fetch() returned undefined");
    return s;
  }
  memo(t, e = {}) {
    let s = this.#w;
    if (!s) throw new Error("no memoMethod provided to constructor");
    let { context: i, forceRefresh: r, ...o } = e, h = this.get(t, o);
    if (!r && h !== void 0) return h;
    let a = s(t, h, { options: o, context: i });
    return this.set(t, a, o), a;
  }
  get(t, e = {}) {
    let { allowStale: s = this.allowStale, updateAgeOnGet: i = this.updateAgeOnGet, noDeleteOnStaleGet: r = this.noDeleteOnStaleGet, status: o } = e, h = this.#f.get(t);
    if (h !== void 0) {
      let a = this.#i[h], l = this.#l(a);
      return o && this.#N(o, h), this.#v(h) ? (o && (o.get = "stale"), l ? (o && s && a.__staleWhileFetching !== void 0 && (o.returnedStale = true), s ? a.__staleWhileFetching : void 0) : (r || this.#O(t, "expire"), o && s && (o.returnedStale = true), s ? a : void 0)) : (o && (o.get = "hit"), l ? a.__staleWhileFetching : (this.#W(h), i && this.#k(h), a));
    } else o && (o.get = "miss");
  }
  #$(t, e) {
    this.#E[e] = t, this.#d[t] = e;
  }
  #W(t) {
    t !== this.#p && (t === this.#b ? this.#b = this.#d[t] : this.#$(this.#E[t], this.#d[t]), this.#$(this.#p, t), this.#p = t);
  }
  delete(t) {
    return this.#O(t, "delete");
  }
  #O(t, e) {
    let s = false;
    if (this.#h !== 0) {
      let i = this.#f.get(t);
      if (i !== void 0) if (this.#y?.[i] && (clearTimeout(this.#y?.[i]), this.#y[i] = void 0), s = true, this.#h === 1) this.#H(e);
      else {
        this.#P(i);
        let r = this.#i[i];
        if (this.#l(r) ? r.__abortController.abort(new Error("deleted")) : (this.#x || this.#e) && (this.#x && this.#n?.(r, t, e), this.#e && this.#m?.push([r, t, e])), this.#f.delete(t), this.#a[i] = void 0, this.#i[i] = void 0, i === this.#p) this.#p = this.#E[i];
        else if (i === this.#b) this.#b = this.#d[i];
        else {
          let o = this.#E[i];
          this.#d[o] = this.#d[i];
          let h = this.#d[i];
          this.#E[h] = this.#E[i];
        }
        this.#h--, this.#R.push(i);
      }
    }
    if (this.#e && this.#m?.length) {
      let i = this.#m, r;
      for (; r = i?.shift(); ) this.#o?.(...r);
    }
    return s;
  }
  clear() {
    return this.#H("delete");
  }
  #H(t) {
    for (let e of this.#D({ allowStale: true })) {
      let s = this.#i[e];
      if (this.#l(s)) s.__abortController.abort(new Error("deleted"));
      else {
        let i = this.#a[e];
        this.#x && this.#n?.(s, i, t), this.#e && this.#m?.push([s, i, t]);
      }
    }
    if (this.#f.clear(), this.#i.fill(void 0), this.#a.fill(void 0), this.#g && this.#T) {
      this.#g.fill(0), this.#T.fill(0);
      for (let e of this.#y ?? []) e !== void 0 && clearTimeout(e);
      this.#y?.fill(void 0);
    }
    if (this.#C && this.#C.fill(0), this.#b = 0, this.#p = 0, this.#R.length = 0, this.#u = 0, this.#h = 0, this.#e && this.#m) {
      let e = this.#m, s;
      for (; s = e?.shift(); ) this.#o?.(...s);
    }
  }
};
var Ne = typeof process == "object" && process ? process : { stdout: null, stderr: null };
var oi = (n7) => !!n7 && typeof n7 == "object" && (n7 instanceof V || n7 instanceof import_node_stream.default || hi(n7) || ai(n7));
var hi = (n7) => !!n7 && typeof n7 == "object" && n7 instanceof import_node_events.EventEmitter && typeof n7.pipe == "function" && n7.pipe !== import_node_stream.default.Writable.prototype.pipe;
var ai = (n7) => !!n7 && typeof n7 == "object" && n7 instanceof import_node_events.EventEmitter && typeof n7.write == "function" && typeof n7.end == "function";
var G = /* @__PURE__ */ Symbol("EOF");
var H = /* @__PURE__ */ Symbol("maybeEmitEnd");
var K = /* @__PURE__ */ Symbol("emittedEnd");
var kt = /* @__PURE__ */ Symbol("emittingEnd");
var ut = /* @__PURE__ */ Symbol("emittedError");
var Rt = /* @__PURE__ */ Symbol("closed");
var _e = /* @__PURE__ */ Symbol("read");
var Ot = /* @__PURE__ */ Symbol("flush");
var Le = /* @__PURE__ */ Symbol("flushChunk");
var P = /* @__PURE__ */ Symbol("encoding");
var et = /* @__PURE__ */ Symbol("decoder");
var v = /* @__PURE__ */ Symbol("flowing");
var dt = /* @__PURE__ */ Symbol("paused");
var st = /* @__PURE__ */ Symbol("resume");
var C = /* @__PURE__ */ Symbol("buffer");
var F = /* @__PURE__ */ Symbol("pipes");
var T = /* @__PURE__ */ Symbol("bufferLength");
var Yt = /* @__PURE__ */ Symbol("bufferPush");
var Ft = /* @__PURE__ */ Symbol("bufferShift");
var k = /* @__PURE__ */ Symbol("objectMode");
var x = /* @__PURE__ */ Symbol("destroyed");
var Xt = /* @__PURE__ */ Symbol("error");
var Jt = /* @__PURE__ */ Symbol("emitData");
var We = /* @__PURE__ */ Symbol("emitEnd");
var Zt = /* @__PURE__ */ Symbol("emitEnd2");
var B = /* @__PURE__ */ Symbol("async");
var Qt = /* @__PURE__ */ Symbol("abort");
var Dt = /* @__PURE__ */ Symbol("aborted");
var pt = /* @__PURE__ */ Symbol("signal");
var Y = /* @__PURE__ */ Symbol("dataListeners");
var M = /* @__PURE__ */ Symbol("discarded");
var mt = (n7) => Promise.resolve().then(n7);
var li = (n7) => n7();
var ci = (n7) => n7 === "end" || n7 === "finish" || n7 === "prefinish";
var fi = (n7) => n7 instanceof ArrayBuffer || !!n7 && typeof n7 == "object" && n7.constructor && n7.constructor.name === "ArrayBuffer" && n7.byteLength >= 0;
var ui = (n7) => !Buffer.isBuffer(n7) && ArrayBuffer.isView(n7);
var Mt = class {
  src;
  dest;
  opts;
  ondrain;
  constructor(t, e, s) {
    this.src = t, this.dest = e, this.opts = s, this.ondrain = () => t[st](), this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  proxyErrors(t) {
  }
  end() {
    this.unpipe(), this.opts.end && this.dest.end();
  }
};
var te = class extends Mt {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors), super.unpipe();
  }
  constructor(t, e, s) {
    super(t, e, s), this.proxyErrors = (i) => this.dest.emit("error", i), t.on("error", this.proxyErrors);
  }
};
var di = (n7) => !!n7.objectMode;
var pi = (n7) => !n7.objectMode && !!n7.encoding && n7.encoding !== "buffer";
var V = class extends import_node_events.EventEmitter {
  [v] = false;
  [dt] = false;
  [F] = [];
  [C] = [];
  [k];
  [P];
  [B];
  [et];
  [G] = false;
  [K] = false;
  [kt] = false;
  [Rt] = false;
  [ut] = null;
  [T] = 0;
  [x] = false;
  [pt];
  [Dt] = false;
  [Y] = 0;
  [M] = false;
  writable = true;
  readable = true;
  constructor(...t) {
    let e = t[0] || {};
    if (super(), e.objectMode && typeof e.encoding == "string") throw new TypeError("Encoding and objectMode may not be used together");
    di(e) ? (this[k] = true, this[P] = null) : pi(e) ? (this[P] = e.encoding, this[k] = false) : (this[k] = false, this[P] = null), this[B] = !!e.async, this[et] = this[P] ? new import_node_string_decoder.StringDecoder(this[P]) : null, e && e.debugExposeBuffer === true && Object.defineProperty(this, "buffer", { get: () => this[C] }), e && e.debugExposePipes === true && Object.defineProperty(this, "pipes", { get: () => this[F] });
    let { signal: s } = e;
    s && (this[pt] = s, s.aborted ? this[Qt]() : s.addEventListener("abort", () => this[Qt]()));
  }
  get bufferLength() {
    return this[T];
  }
  get encoding() {
    return this[P];
  }
  set encoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  setEncoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  get objectMode() {
    return this[k];
  }
  set objectMode(t) {
    throw new Error("objectMode must be set at instantiation time");
  }
  get async() {
    return this[B];
  }
  set async(t) {
    this[B] = this[B] || !!t;
  }
  [Qt]() {
    this[Dt] = true, this.emit("abort", this[pt]?.reason), this.destroy(this[pt]?.reason);
  }
  get aborted() {
    return this[Dt];
  }
  set aborted(t) {
  }
  write(t, e, s) {
    if (this[Dt]) return false;
    if (this[G]) throw new Error("write after end");
    if (this[x]) return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })), true;
    typeof e == "function" && (s = e, e = "utf8"), e || (e = "utf8");
    let i = this[B] ? mt : li;
    if (!this[k] && !Buffer.isBuffer(t)) {
      if (ui(t)) t = Buffer.from(t.buffer, t.byteOffset, t.byteLength);
      else if (fi(t)) t = Buffer.from(t);
      else if (typeof t != "string") throw new Error("Non-contiguous data written to non-objectMode stream");
    }
    return this[k] ? (this[v] && this[T] !== 0 && this[Ot](true), this[v] ? this.emit("data", t) : this[Yt](t), this[T] !== 0 && this.emit("readable"), s && i(s), this[v]) : t.length ? (typeof t == "string" && !(e === this[P] && !this[et]?.lastNeed) && (t = Buffer.from(t, e)), Buffer.isBuffer(t) && this[P] && (t = this[et].write(t)), this[v] && this[T] !== 0 && this[Ot](true), this[v] ? this.emit("data", t) : this[Yt](t), this[T] !== 0 && this.emit("readable"), s && i(s), this[v]) : (this[T] !== 0 && this.emit("readable"), s && i(s), this[v]);
  }
  read(t) {
    if (this[x]) return null;
    if (this[M] = false, this[T] === 0 || t === 0 || t && t > this[T]) return this[H](), null;
    this[k] && (t = null), this[C].length > 1 && !this[k] && (this[C] = [this[P] ? this[C].join("") : Buffer.concat(this[C], this[T])]);
    let e = this[_e](t || null, this[C][0]);
    return this[H](), e;
  }
  [_e](t, e) {
    if (this[k]) this[Ft]();
    else {
      let s = e;
      t === s.length || t === null ? this[Ft]() : typeof s == "string" ? (this[C][0] = s.slice(t), e = s.slice(0, t), this[T] -= t) : (this[C][0] = s.subarray(t), e = s.subarray(0, t), this[T] -= t);
    }
    return this.emit("data", e), !this[C].length && !this[G] && this.emit("drain"), e;
  }
  end(t, e, s) {
    return typeof t == "function" && (s = t, t = void 0), typeof e == "function" && (s = e, e = "utf8"), t !== void 0 && this.write(t, e), s && this.once("end", s), this[G] = true, this.writable = false, (this[v] || !this[dt]) && this[H](), this;
  }
  [st]() {
    this[x] || (!this[Y] && !this[F].length && (this[M] = true), this[dt] = false, this[v] = true, this.emit("resume"), this[C].length ? this[Ot]() : this[G] ? this[H]() : this.emit("drain"));
  }
  resume() {
    return this[st]();
  }
  pause() {
    this[v] = false, this[dt] = true, this[M] = false;
  }
  get destroyed() {
    return this[x];
  }
  get flowing() {
    return this[v];
  }
  get paused() {
    return this[dt];
  }
  [Yt](t) {
    this[k] ? this[T] += 1 : this[T] += t.length, this[C].push(t);
  }
  [Ft]() {
    return this[k] ? this[T] -= 1 : this[T] -= this[C][0].length, this[C].shift();
  }
  [Ot](t = false) {
    do
      ;
    while (this[Le](this[Ft]()) && this[C].length);
    !t && !this[C].length && !this[G] && this.emit("drain");
  }
  [Le](t) {
    return this.emit("data", t), this[v];
  }
  pipe(t, e) {
    if (this[x]) return t;
    this[M] = false;
    let s = this[K];
    return e = e || {}, t === Ne.stdout || t === Ne.stderr ? e.end = false : e.end = e.end !== false, e.proxyErrors = !!e.proxyErrors, s ? e.end && t.end() : (this[F].push(e.proxyErrors ? new te(this, t, e) : new Mt(this, t, e)), this[B] ? mt(() => this[st]()) : this[st]()), t;
  }
  unpipe(t) {
    let e = this[F].find((s) => s.dest === t);
    e && (this[F].length === 1 ? (this[v] && this[Y] === 0 && (this[v] = false), this[F] = []) : this[F].splice(this[F].indexOf(e), 1), e.unpipe());
  }
  addListener(t, e) {
    return this.on(t, e);
  }
  on(t, e) {
    let s = super.on(t, e);
    if (t === "data") this[M] = false, this[Y]++, !this[F].length && !this[v] && this[st]();
    else if (t === "readable" && this[T] !== 0) super.emit("readable");
    else if (ci(t) && this[K]) super.emit(t), this.removeAllListeners(t);
    else if (t === "error" && this[ut]) {
      let i = e;
      this[B] ? mt(() => i.call(this, this[ut])) : i.call(this, this[ut]);
    }
    return s;
  }
  removeListener(t, e) {
    return this.off(t, e);
  }
  off(t, e) {
    let s = super.off(t, e);
    return t === "data" && (this[Y] = this.listeners("data").length, this[Y] === 0 && !this[M] && !this[F].length && (this[v] = false)), s;
  }
  removeAllListeners(t) {
    let e = super.removeAllListeners(t);
    return (t === "data" || t === void 0) && (this[Y] = 0, !this[M] && !this[F].length && (this[v] = false)), e;
  }
  get emittedEnd() {
    return this[K];
  }
  [H]() {
    !this[kt] && !this[K] && !this[x] && this[C].length === 0 && this[G] && (this[kt] = true, this.emit("end"), this.emit("prefinish"), this.emit("finish"), this[Rt] && this.emit("close"), this[kt] = false);
  }
  emit(t, ...e) {
    let s = e[0];
    if (t !== "error" && t !== "close" && t !== x && this[x]) return false;
    if (t === "data") return !this[k] && !s ? false : this[B] ? (mt(() => this[Jt](s)), true) : this[Jt](s);
    if (t === "end") return this[We]();
    if (t === "close") {
      if (this[Rt] = true, !this[K] && !this[x]) return false;
      let r = super.emit("close");
      return this.removeAllListeners("close"), r;
    } else if (t === "error") {
      this[ut] = s, super.emit(Xt, s);
      let r = !this[pt] || this.listeners("error").length ? super.emit("error", s) : false;
      return this[H](), r;
    } else if (t === "resume") {
      let r = super.emit("resume");
      return this[H](), r;
    } else if (t === "finish" || t === "prefinish") {
      let r = super.emit(t);
      return this.removeAllListeners(t), r;
    }
    let i = super.emit(t, ...e);
    return this[H](), i;
  }
  [Jt](t) {
    for (let s of this[F]) s.dest.write(t) === false && this.pause();
    let e = this[M] ? false : super.emit("data", t);
    return this[H](), e;
  }
  [We]() {
    return this[K] ? false : (this[K] = true, this.readable = false, this[B] ? (mt(() => this[Zt]()), true) : this[Zt]());
  }
  [Zt]() {
    if (this[et]) {
      let e = this[et].end();
      if (e) {
        for (let s of this[F]) s.dest.write(e);
        this[M] || super.emit("data", e);
      }
    }
    for (let e of this[F]) e.end();
    let t = super.emit("end");
    return this.removeAllListeners("end"), t;
  }
  async collect() {
    let t = Object.assign([], { dataLength: 0 });
    this[k] || (t.dataLength = 0);
    let e = this.promise();
    return this.on("data", (s) => {
      t.push(s), this[k] || (t.dataLength += s.length);
    }), await e, t;
  }
  async concat() {
    if (this[k]) throw new Error("cannot concat in objectMode");
    let t = await this.collect();
    return this[P] ? t.join("") : Buffer.concat(t, t.dataLength);
  }
  async promise() {
    return new Promise((t, e) => {
      this.on(x, () => e(new Error("stream destroyed"))), this.on("error", (s) => e(s)), this.on("end", () => t());
    });
  }
  [Symbol.asyncIterator]() {
    this[M] = false;
    let t = false, e = async () => (this.pause(), t = true, { value: void 0, done: true });
    return { next: () => {
      if (t) return e();
      let i = this.read();
      if (i !== null) return Promise.resolve({ done: false, value: i });
      if (this[G]) return e();
      let r, o, h = (c) => {
        this.off("data", a), this.off("end", l), this.off(x, u), e(), o(c);
      }, a = (c) => {
        this.off("error", h), this.off("end", l), this.off(x, u), this.pause(), r({ value: c, done: !!this[G] });
      }, l = () => {
        this.off("error", h), this.off("data", a), this.off(x, u), e(), r({ done: true, value: void 0 });
      }, u = () => h(new Error("stream destroyed"));
      return new Promise((c, d) => {
        o = d, r = c, this.once(x, u), this.once("error", h), this.once("end", l), this.once("data", a);
      });
    }, throw: e, return: e, [Symbol.asyncIterator]() {
      return this;
    }, [Symbol.asyncDispose]: async () => {
    } };
  }
  [Symbol.iterator]() {
    this[M] = false;
    let t = false, e = () => (this.pause(), this.off(Xt, e), this.off(x, e), this.off("end", e), t = true, { done: true, value: void 0 }), s = () => {
      if (t) return e();
      let i = this.read();
      return i === null ? e() : { done: false, value: i };
    };
    return this.once("end", e), this.once(Xt, e), this.once(x, e), { next: s, throw: e, return: e, [Symbol.iterator]() {
      return this;
    }, [Symbol.dispose]: () => {
    } };
  }
  destroy(t) {
    if (this[x]) return t ? this.emit("error", t) : this.emit(x), this;
    this[x] = true, this[M] = true, this[C].length = 0, this[T] = 0;
    let e = this;
    return typeof e.close == "function" && !this[Rt] && e.close(), t ? this.emit("error", t) : this.emit(x), this;
  }
  static get isStream() {
    return oi;
  }
};
var vi = import_fs.realpathSync.native;
var wt = { lstatSync: import_fs.lstatSync, readdir: import_fs.readdir, readdirSync: import_fs.readdirSync, readlinkSync: import_fs.readlinkSync, realpathSync: vi, promises: { lstat: import_promises.lstat, readdir: import_promises.readdir, readlink: import_promises.readlink, realpath: import_promises.realpath } };
var Ue = (n7) => !n7 || n7 === wt || n7 === xi ? wt : { ...wt, ...n7, promises: { ...wt.promises, ...n7.promises || {} } };
var $e = /^\\\\\?\\([a-z]:)\\?$/i;
var Ri = (n7) => n7.replace(/\//g, "\\").replace($e, "$1\\");
var Oi = /[\\\/]/;
var L = 0;
var Ge = 1;
var He = 2;
var U = 4;
var qe = 6;
var Ke = 8;
var X = 10;
var Ve = 12;
var _ = 15;
var gt = ~_;
var se = 16;
var je = 32;
var yt = 64;
var j = 128;
var Nt = 256;
var Lt = 512;
var Ie = yt | j | Lt;
var Fi = 1023;
var ie = (n7) => n7.isFile() ? Ke : n7.isDirectory() ? U : n7.isSymbolicLink() ? X : n7.isCharacterDevice() ? He : n7.isBlockDevice() ? qe : n7.isSocket() ? Ve : n7.isFIFO() ? Ge : L;
var ze = new ft({ max: 2 ** 12 });
var bt = (n7) => {
  let t = ze.get(n7);
  if (t) return t;
  let e = n7.normalize("NFKD");
  return ze.set(n7, e), e;
};
var Be = new ft({ max: 2 ** 12 });
var _t = (n7) => {
  let t = Be.get(n7);
  if (t) return t;
  let e = bt(n7.toLowerCase());
  return Be.set(n7, e), e;
};
var Wt = class extends ft {
  constructor() {
    super({ max: 256 });
  }
};
var ne = class extends ft {
  constructor(t = 16 * 1024) {
    super({ maxSize: t, sizeCalculation: (e) => e.length + 1 });
  }
};
var Ye = /* @__PURE__ */ Symbol("PathScurry setAsCwd");
var R = class {
  name;
  root;
  roots;
  parent;
  nocase;
  isCWD = false;
  #t;
  #s;
  get dev() {
    return this.#s;
  }
  #n;
  get mode() {
    return this.#n;
  }
  #r;
  get nlink() {
    return this.#r;
  }
  #o;
  get uid() {
    return this.#o;
  }
  #S;
  get gid() {
    return this.#S;
  }
  #w;
  get rdev() {
    return this.#w;
  }
  #c;
  get blksize() {
    return this.#c;
  }
  #h;
  get ino() {
    return this.#h;
  }
  #u;
  get size() {
    return this.#u;
  }
  #f;
  get blocks() {
    return this.#f;
  }
  #a;
  get atimeMs() {
    return this.#a;
  }
  #i;
  get mtimeMs() {
    return this.#i;
  }
  #d;
  get ctimeMs() {
    return this.#d;
  }
  #E;
  get birthtimeMs() {
    return this.#E;
  }
  #b;
  get atime() {
    return this.#b;
  }
  #p;
  get mtime() {
    return this.#p;
  }
  #R;
  get ctime() {
    return this.#R;
  }
  #m;
  get birthtime() {
    return this.#m;
  }
  #C;
  #T;
  #g;
  #y;
  #x;
  #A;
  #e;
  #_;
  #M;
  #k;
  get parentPath() {
    return (this.parent || this).fullpath();
  }
  get path() {
    return this.parentPath;
  }
  constructor(t, e = L, s, i, r, o, h) {
    this.name = t, this.#C = r ? _t(t) : bt(t), this.#e = e & Fi, this.nocase = r, this.roots = i, this.root = s || this, this.#_ = o, this.#g = h.fullpath, this.#x = h.relative, this.#A = h.relativePosix, this.parent = h.parent, this.parent ? this.#t = this.parent.#t : this.#t = Ue(h.fs);
  }
  depth() {
    return this.#T !== void 0 ? this.#T : this.parent ? this.#T = this.parent.depth() + 1 : this.#T = 0;
  }
  childrenCache() {
    return this.#_;
  }
  resolve(t) {
    if (!t) return this;
    let e = this.getRootString(t), i = t.substring(e.length).split(this.splitSep);
    return e ? this.getRoot(e).#N(i) : this.#N(i);
  }
  #N(t) {
    let e = this;
    for (let s of t) e = e.child(s);
    return e;
  }
  children() {
    let t = this.#_.get(this);
    if (t) return t;
    let e = Object.assign([], { provisional: 0 });
    return this.#_.set(this, e), this.#e &= ~se, e;
  }
  child(t, e) {
    if (t === "" || t === ".") return this;
    if (t === "..") return this.parent || this;
    let s = this.children(), i = this.nocase ? _t(t) : bt(t);
    for (let a of s) if (a.#C === i) return a;
    let r = this.parent ? this.sep : "", o = this.#g ? this.#g + r + t : void 0, h = this.newChild(t, L, { ...e, parent: this, fullpath: o });
    return this.canReaddir() || (h.#e |= j), s.push(h), h;
  }
  relative() {
    if (this.isCWD) return "";
    if (this.#x !== void 0) return this.#x;
    let t = this.name, e = this.parent;
    if (!e) return this.#x = this.name;
    let s = e.relative();
    return s + (!s || !e.parent ? "" : this.sep) + t;
  }
  relativePosix() {
    if (this.sep === "/") return this.relative();
    if (this.isCWD) return "";
    if (this.#A !== void 0) return this.#A;
    let t = this.name, e = this.parent;
    if (!e) return this.#A = this.fullpathPosix();
    let s = e.relativePosix();
    return s + (!s || !e.parent ? "" : "/") + t;
  }
  fullpath() {
    if (this.#g !== void 0) return this.#g;
    let t = this.name, e = this.parent;
    if (!e) return this.#g = this.name;
    let i = e.fullpath() + (e.parent ? this.sep : "") + t;
    return this.#g = i;
  }
  fullpathPosix() {
    if (this.#y !== void 0) return this.#y;
    if (this.sep === "/") return this.#y = this.fullpath();
    if (!this.parent) {
      let i = this.fullpath().replace(/\\/g, "/");
      return /^[a-z]:\//i.test(i) ? this.#y = `//?/${i}` : this.#y = i;
    }
    let t = this.parent, e = t.fullpathPosix(), s = e + (!e || !t.parent ? "" : "/") + this.name;
    return this.#y = s;
  }
  isUnknown() {
    return (this.#e & _) === L;
  }
  isType(t) {
    return this[`is${t}`]();
  }
  getType() {
    return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : this.isSocket() ? "Socket" : "Unknown";
  }
  isFile() {
    return (this.#e & _) === Ke;
  }
  isDirectory() {
    return (this.#e & _) === U;
  }
  isCharacterDevice() {
    return (this.#e & _) === He;
  }
  isBlockDevice() {
    return (this.#e & _) === qe;
  }
  isFIFO() {
    return (this.#e & _) === Ge;
  }
  isSocket() {
    return (this.#e & _) === Ve;
  }
  isSymbolicLink() {
    return (this.#e & X) === X;
  }
  lstatCached() {
    return this.#e & je ? this : void 0;
  }
  readlinkCached() {
    return this.#M;
  }
  realpathCached() {
    return this.#k;
  }
  readdirCached() {
    let t = this.children();
    return t.slice(0, t.provisional);
  }
  canReadlink() {
    if (this.#M) return true;
    if (!this.parent) return false;
    let t = this.#e & _;
    return !(t !== L && t !== X || this.#e & Nt || this.#e & j);
  }
  calledReaddir() {
    return !!(this.#e & se);
  }
  isENOENT() {
    return !!(this.#e & j);
  }
  isNamed(t) {
    return this.nocase ? this.#C === _t(t) : this.#C === bt(t);
  }
  async readlink() {
    let t = this.#M;
    if (t) return t;
    if (this.canReadlink() && this.parent) try {
      let e = await this.#t.promises.readlink(this.fullpath()), s = (await this.parent.realpath())?.resolve(e);
      if (s) return this.#M = s;
    } catch (e) {
      this.#D(e.code);
      return;
    }
  }
  readlinkSync() {
    let t = this.#M;
    if (t) return t;
    if (this.canReadlink() && this.parent) try {
      let e = this.#t.readlinkSync(this.fullpath()), s = this.parent.realpathSync()?.resolve(e);
      if (s) return this.#M = s;
    } catch (e) {
      this.#D(e.code);
      return;
    }
  }
  #j(t) {
    this.#e |= se;
    for (let e = t.provisional; e < t.length; e++) {
      let s = t[e];
      s && s.#v();
    }
  }
  #v() {
    this.#e & j || (this.#e = (this.#e | j) & gt, this.#G());
  }
  #G() {
    let t = this.children();
    t.provisional = 0;
    for (let e of t) e.#v();
  }
  #P() {
    this.#e |= Lt, this.#L();
  }
  #L() {
    if (this.#e & yt) return;
    let t = this.#e;
    (t & _) === U && (t &= gt), this.#e = t | yt, this.#G();
  }
  #I(t = "") {
    t === "ENOTDIR" || t === "EPERM" ? this.#L() : t === "ENOENT" ? this.#v() : this.children().provisional = 0;
  }
  #F(t = "") {
    t === "ENOTDIR" ? this.parent.#L() : t === "ENOENT" && this.#v();
  }
  #D(t = "") {
    let e = this.#e;
    e |= Nt, t === "ENOENT" && (e |= j), (t === "EINVAL" || t === "UNKNOWN") && (e &= gt), this.#e = e, t === "ENOTDIR" && this.parent && this.parent.#L();
  }
  #z(t, e) {
    return this.#U(t, e) || this.#B(t, e);
  }
  #B(t, e) {
    let s = ie(t), i = this.newChild(t.name, s, { parent: this }), r = i.#e & _;
    return r !== U && r !== X && r !== L && (i.#e |= yt), e.unshift(i), e.provisional++, i;
  }
  #U(t, e) {
    for (let s = e.provisional; s < e.length; s++) {
      let i = e[s];
      if ((this.nocase ? _t(t.name) : bt(t.name)) === i.#C) return this.#l(t, i, s, e);
    }
  }
  #l(t, e, s, i) {
    let r = e.name;
    return e.#e = e.#e & gt | ie(t), r !== t.name && (e.name = t.name), s !== i.provisional && (s === i.length - 1 ? i.pop() : i.splice(s, 1), i.unshift(e)), i.provisional++, e;
  }
  async lstat() {
    if ((this.#e & j) === 0) try {
      return this.#$(await this.#t.promises.lstat(this.fullpath())), this;
    } catch (t) {
      this.#F(t.code);
    }
  }
  lstatSync() {
    if ((this.#e & j) === 0) try {
      return this.#$(this.#t.lstatSync(this.fullpath())), this;
    } catch (t) {
      this.#F(t.code);
    }
  }
  #$(t) {
    let { atime: e, atimeMs: s, birthtime: i, birthtimeMs: r, blksize: o, blocks: h, ctime: a, ctimeMs: l, dev: u, gid: c, ino: d, mode: f, mtime: m, mtimeMs: p, nlink: w, rdev: g, size: S, uid: E } = t;
    this.#b = e, this.#a = s, this.#m = i, this.#E = r, this.#c = o, this.#f = h, this.#R = a, this.#d = l, this.#s = u, this.#S = c, this.#h = d, this.#n = f, this.#p = m, this.#i = p, this.#r = w, this.#w = g, this.#u = S, this.#o = E;
    let y = ie(t);
    this.#e = this.#e & gt | y | je, y !== L && y !== U && y !== X && (this.#e |= yt);
  }
  #W = [];
  #O = false;
  #H(t) {
    this.#O = false;
    let e = this.#W.slice();
    this.#W.length = 0, e.forEach((s) => s(null, t));
  }
  readdirCB(t, e = false) {
    if (!this.canReaddir()) {
      e ? t(null, []) : queueMicrotask(() => t(null, []));
      return;
    }
    let s = this.children();
    if (this.calledReaddir()) {
      let r = s.slice(0, s.provisional);
      e ? t(null, r) : queueMicrotask(() => t(null, r));
      return;
    }
    if (this.#W.push(t), this.#O) return;
    this.#O = true;
    let i = this.fullpath();
    this.#t.readdir(i, { withFileTypes: true }, (r, o) => {
      if (r) this.#I(r.code), s.provisional = 0;
      else {
        for (let h of o) this.#z(h, s);
        this.#j(s);
      }
      this.#H(s.slice(0, s.provisional));
    });
  }
  #q;
  async readdir() {
    if (!this.canReaddir()) return [];
    let t = this.children();
    if (this.calledReaddir()) return t.slice(0, t.provisional);
    let e = this.fullpath();
    if (this.#q) await this.#q;
    else {
      let s = () => {
      };
      this.#q = new Promise((i) => s = i);
      try {
        for (let i of await this.#t.promises.readdir(e, { withFileTypes: true })) this.#z(i, t);
        this.#j(t);
      } catch (i) {
        this.#I(i.code), t.provisional = 0;
      }
      this.#q = void 0, s();
    }
    return t.slice(0, t.provisional);
  }
  readdirSync() {
    if (!this.canReaddir()) return [];
    let t = this.children();
    if (this.calledReaddir()) return t.slice(0, t.provisional);
    let e = this.fullpath();
    try {
      for (let s of this.#t.readdirSync(e, { withFileTypes: true })) this.#z(s, t);
      this.#j(t);
    } catch (s) {
      this.#I(s.code), t.provisional = 0;
    }
    return t.slice(0, t.provisional);
  }
  canReaddir() {
    if (this.#e & Ie) return false;
    let t = _ & this.#e;
    return t === L || t === U || t === X;
  }
  shouldWalk(t, e) {
    return (this.#e & U) === U && !(this.#e & Ie) && !t.has(this) && (!e || e(this));
  }
  async realpath() {
    if (this.#k) return this.#k;
    if (!((Lt | Nt | j) & this.#e)) try {
      let t = await this.#t.promises.realpath(this.fullpath());
      return this.#k = this.resolve(t);
    } catch {
      this.#P();
    }
  }
  realpathSync() {
    if (this.#k) return this.#k;
    if (!((Lt | Nt | j) & this.#e)) try {
      let t = this.#t.realpathSync(this.fullpath());
      return this.#k = this.resolve(t);
    } catch {
      this.#P();
    }
  }
  [Ye](t) {
    if (t === this) return;
    t.isCWD = false, this.isCWD = true;
    let e = /* @__PURE__ */ new Set([]), s = [], i = this;
    for (; i && i.parent; ) e.add(i), i.#x = s.join(this.sep), i.#A = s.join("/"), i = i.parent, s.push("..");
    for (i = t; i && i.parent && !e.has(i); ) i.#x = void 0, i.#A = void 0, i = i.parent;
  }
};
var Pt = class n2 extends R {
  sep = "\\";
  splitSep = Oi;
  constructor(t, e = L, s, i, r, o, h) {
    super(t, e, s, i, r, o, h);
  }
  newChild(t, e = L, s = {}) {
    return new n2(t, e, this.root, this.roots, this.nocase, this.childrenCache(), s);
  }
  getRootString(t) {
    return import_node_path.win32.parse(t).root;
  }
  getRoot(t) {
    if (t = Ri(t.toUpperCase()), t === this.root.name) return this.root;
    for (let [e, s] of Object.entries(this.roots)) if (this.sameRoot(t, e)) return this.roots[t] = s;
    return this.roots[t] = new it(t, this).root;
  }
  sameRoot(t, e = this.root.name) {
    return t = t.toUpperCase().replace(/\//g, "\\").replace($e, "$1\\"), t === e;
  }
};
var jt = class n3 extends R {
  splitSep = "/";
  sep = "/";
  constructor(t, e = L, s, i, r, o, h) {
    super(t, e, s, i, r, o, h);
  }
  getRootString(t) {
    return t.startsWith("/") ? "/" : "";
  }
  getRoot(t) {
    return this.root;
  }
  newChild(t, e = L, s = {}) {
    return new n3(t, e, this.root, this.roots, this.nocase, this.childrenCache(), s);
  }
};
var It = class {
  root;
  rootPath;
  roots;
  cwd;
  #t;
  #s;
  #n;
  nocase;
  #r;
  constructor(t = process.cwd(), e, s, { nocase: i, childrenCacheSize: r = 16 * 1024, fs: o = wt } = {}) {
    this.#r = Ue(o), (t instanceof URL || t.startsWith("file://")) && (t = (0, import_node_url2.fileURLToPath)(t));
    let h = e.resolve(t);
    this.roots = /* @__PURE__ */ Object.create(null), this.rootPath = this.parseRootPath(h), this.#t = new Wt(), this.#s = new Wt(), this.#n = new ne(r);
    let a = h.substring(this.rootPath.length).split(s);
    if (a.length === 1 && !a[0] && a.pop(), i === void 0) throw new TypeError("must provide nocase setting to PathScurryBase ctor");
    this.nocase = i, this.root = this.newRoot(this.#r), this.roots[this.rootPath] = this.root;
    let l = this.root, u = a.length - 1, c = e.sep, d = this.rootPath, f = false;
    for (let m of a) {
      let p = u--;
      l = l.child(m, { relative: new Array(p).fill("..").join(c), relativePosix: new Array(p).fill("..").join("/"), fullpath: d += (f ? "" : c) + m }), f = true;
    }
    this.cwd = l;
  }
  depth(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.depth();
  }
  childrenCache() {
    return this.#n;
  }
  resolve(...t) {
    let e = "";
    for (let r = t.length - 1; r >= 0; r--) {
      let o = t[r];
      if (!(!o || o === ".") && (e = e ? `${o}/${e}` : o, this.isAbsolute(o))) break;
    }
    let s = this.#t.get(e);
    if (s !== void 0) return s;
    let i = this.cwd.resolve(e).fullpath();
    return this.#t.set(e, i), i;
  }
  resolvePosix(...t) {
    let e = "";
    for (let r = t.length - 1; r >= 0; r--) {
      let o = t[r];
      if (!(!o || o === ".") && (e = e ? `${o}/${e}` : o, this.isAbsolute(o))) break;
    }
    let s = this.#s.get(e);
    if (s !== void 0) return s;
    let i = this.cwd.resolve(e).fullpathPosix();
    return this.#s.set(e, i), i;
  }
  relative(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.relative();
  }
  relativePosix(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.relativePosix();
  }
  basename(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.name;
  }
  dirname(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), (t.parent || t).fullpath();
  }
  async readdir(t = this.cwd, e = { withFileTypes: true }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s } = e;
    if (t.canReaddir()) {
      let i = await t.readdir();
      return s ? i : i.map((r) => r.name);
    } else return [];
  }
  readdirSync(t = this.cwd, e = { withFileTypes: true }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true } = e;
    return t.canReaddir() ? s ? t.readdirSync() : t.readdirSync().map((i) => i.name) : [];
  }
  async lstat(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.lstat();
  }
  lstatSync(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.lstatSync();
  }
  async readlink(t = this.cwd, { withFileTypes: e } = { withFileTypes: false }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t.withFileTypes, t = this.cwd);
    let s = await t.readlink();
    return e ? s : s?.fullpath();
  }
  readlinkSync(t = this.cwd, { withFileTypes: e } = { withFileTypes: false }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t.withFileTypes, t = this.cwd);
    let s = t.readlinkSync();
    return e ? s : s?.fullpath();
  }
  async realpath(t = this.cwd, { withFileTypes: e } = { withFileTypes: false }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t.withFileTypes, t = this.cwd);
    let s = await t.realpath();
    return e ? s : s?.fullpath();
  }
  realpathSync(t = this.cwd, { withFileTypes: e } = { withFileTypes: false }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t.withFileTypes, t = this.cwd);
    let s = t.realpathSync();
    return e ? s : s?.fullpath();
  }
  async walk(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true, follow: i = false, filter: r, walkFilter: o } = e, h = [];
    (!r || r(t)) && h.push(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set(), l = (c, d) => {
      a.add(c), c.readdirCB((f, m) => {
        if (f) return d(f);
        let p = m.length;
        if (!p) return d();
        let w = () => {
          --p === 0 && d();
        };
        for (let g of m) (!r || r(g)) && h.push(s ? g : g.fullpath()), i && g.isSymbolicLink() ? g.realpath().then((S) => S?.isUnknown() ? S.lstat() : S).then((S) => S?.shouldWalk(a, o) ? l(S, w) : w()) : g.shouldWalk(a, o) ? l(g, w) : w();
      }, true);
    }, u = t;
    return new Promise((c, d) => {
      l(u, (f) => {
        if (f) return d(f);
        c(h);
      });
    });
  }
  walkSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true, follow: i = false, filter: r, walkFilter: o } = e, h = [];
    (!r || r(t)) && h.push(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set([t]);
    for (let l of a) {
      let u = l.readdirSync();
      for (let c of u) {
        (!r || r(c)) && h.push(s ? c : c.fullpath());
        let d = c;
        if (c.isSymbolicLink()) {
          if (!(i && (d = c.realpathSync()))) continue;
          d.isUnknown() && d.lstatSync();
        }
        d.shouldWalk(a, o) && a.add(d);
      }
    }
    return h;
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
  iterate(t = this.cwd, e = {}) {
    return typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd), this.stream(t, e)[Symbol.asyncIterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  *iterateSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true, follow: i = false, filter: r, walkFilter: o } = e;
    (!r || r(t)) && (yield s ? t : t.fullpath());
    let h = /* @__PURE__ */ new Set([t]);
    for (let a of h) {
      let l = a.readdirSync();
      for (let u of l) {
        (!r || r(u)) && (yield s ? u : u.fullpath());
        let c = u;
        if (u.isSymbolicLink()) {
          if (!(i && (c = u.realpathSync()))) continue;
          c.isUnknown() && c.lstatSync();
        }
        c.shouldWalk(h, o) && h.add(c);
      }
    }
  }
  stream(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true, follow: i = false, filter: r, walkFilter: o } = e, h = new V({ objectMode: true });
    (!r || r(t)) && h.write(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set(), l = [t], u = 0, c = () => {
      let d = false;
      for (; !d; ) {
        let f = l.shift();
        if (!f) {
          u === 0 && h.end();
          return;
        }
        u++, a.add(f);
        let m = (w, g, S = false) => {
          if (w) return h.emit("error", w);
          if (i && !S) {
            let E = [];
            for (let y of g) y.isSymbolicLink() && E.push(y.realpath().then((b) => b?.isUnknown() ? b.lstat() : b));
            if (E.length) {
              Promise.all(E).then(() => m(null, g, true));
              return;
            }
          }
          for (let E of g) E && (!r || r(E)) && (h.write(s ? E : E.fullpath()) || (d = true));
          u--;
          for (let E of g) {
            let y = E.realpathCached() || E;
            y.shouldWalk(a, o) && l.push(y);
          }
          d && !h.flowing ? h.once("drain", c) : p || c();
        }, p = true;
        f.readdirCB(m, true), p = false;
      }
    };
    return c(), h;
  }
  streamSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof R || (e = t, t = this.cwd);
    let { withFileTypes: s = true, follow: i = false, filter: r, walkFilter: o } = e, h = new V({ objectMode: true }), a = /* @__PURE__ */ new Set();
    (!r || r(t)) && h.write(s ? t : t.fullpath());
    let l = [t], u = 0, c = () => {
      let d = false;
      for (; !d; ) {
        let f = l.shift();
        if (!f) {
          u === 0 && h.end();
          return;
        }
        u++, a.add(f);
        let m = f.readdirSync();
        for (let p of m) (!r || r(p)) && (h.write(s ? p : p.fullpath()) || (d = true));
        u--;
        for (let p of m) {
          let w = p;
          if (p.isSymbolicLink()) {
            if (!(i && (w = p.realpathSync()))) continue;
            w.isUnknown() && w.lstatSync();
          }
          w.shouldWalk(a, o) && l.push(w);
        }
      }
      d && !h.flowing && h.once("drain", c);
    };
    return c(), h;
  }
  chdir(t = this.cwd) {
    let e = this.cwd;
    this.cwd = typeof t == "string" ? this.cwd.resolve(t) : t, this.cwd[Ye](e);
  }
};
var it = class extends It {
  sep = "\\";
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = true } = e;
    super(t, import_node_path.win32, "\\", { ...e, nocase: s }), this.nocase = s;
    for (let i = this.cwd; i; i = i.parent) i.nocase = this.nocase;
  }
  parseRootPath(t) {
    return import_node_path.win32.parse(t).root.toUpperCase();
  }
  newRoot(t) {
    return new Pt(this.rootPath, U, void 0, this.roots, this.nocase, this.childrenCache(), { fs: t });
  }
  isAbsolute(t) {
    return t.startsWith("/") || t.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(t);
  }
};
var rt = class extends It {
  sep = "/";
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = false } = e;
    super(t, import_node_path.posix, "/", { ...e, nocase: s }), this.nocase = s;
  }
  parseRootPath(t) {
    return "/";
  }
  newRoot(t) {
    return new jt(this.rootPath, U, void 0, this.roots, this.nocase, this.childrenCache(), { fs: t });
  }
  isAbsolute(t) {
    return t.startsWith("/");
  }
};
var St = class extends rt {
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = true } = e;
    super(t, { ...e, nocase: s });
  }
};
var Cr = process.platform === "win32" ? Pt : jt;
var Xe = process.platform === "win32" ? it : process.platform === "darwin" ? St : rt;
var Di = (n7) => n7.length >= 1;
var Mi = (n7) => n7.length >= 1;
var Ni = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var nt = class n4 {
  #t;
  #s;
  #n;
  length;
  #r;
  #o;
  #S;
  #w;
  #c;
  #h;
  #u = true;
  constructor(t, e, s, i) {
    if (!Di(t)) throw new TypeError("empty pattern list");
    if (!Mi(e)) throw new TypeError("empty glob list");
    if (e.length !== t.length) throw new TypeError("mismatched pattern list and glob list lengths");
    if (this.length = t.length, s < 0 || s >= this.length) throw new TypeError("index out of range");
    if (this.#t = t, this.#s = e, this.#n = s, this.#r = i, this.#n === 0) {
      if (this.isUNC()) {
        let [r, o, h, a, ...l] = this.#t, [u, c, d, f, ...m] = this.#s;
        l[0] === "" && (l.shift(), m.shift());
        let p = [r, o, h, a, ""].join("/"), w = [u, c, d, f, ""].join("/");
        this.#t = [p, ...l], this.#s = [w, ...m], this.length = this.#t.length;
      } else if (this.isDrive() || this.isAbsolute()) {
        let [r, ...o] = this.#t, [h, ...a] = this.#s;
        o[0] === "" && (o.shift(), a.shift());
        let l = r + "/", u = h + "/";
        this.#t = [l, ...o], this.#s = [u, ...a], this.length = this.#t.length;
      }
    }
  }
  [Ni]() {
    return "Pattern <" + this.#s.slice(this.#n).join("/") + ">";
  }
  pattern() {
    return this.#t[this.#n];
  }
  isString() {
    return typeof this.#t[this.#n] == "string";
  }
  isGlobstar() {
    return this.#t[this.#n] === A;
  }
  isRegExp() {
    return this.#t[this.#n] instanceof RegExp;
  }
  globString() {
    return this.#S = this.#S || (this.#n === 0 ? this.isAbsolute() ? this.#s[0] + this.#s.slice(1).join("/") : this.#s.join("/") : this.#s.slice(this.#n).join("/"));
  }
  hasMore() {
    return this.length > this.#n + 1;
  }
  rest() {
    return this.#o !== void 0 ? this.#o : this.hasMore() ? (this.#o = new n4(this.#t, this.#s, this.#n + 1, this.#r), this.#o.#h = this.#h, this.#o.#c = this.#c, this.#o.#w = this.#w, this.#o) : this.#o = null;
  }
  isUNC() {
    let t = this.#t;
    return this.#c !== void 0 ? this.#c : this.#c = this.#r === "win32" && this.#n === 0 && t[0] === "" && t[1] === "" && typeof t[2] == "string" && !!t[2] && typeof t[3] == "string" && !!t[3];
  }
  isDrive() {
    let t = this.#t;
    return this.#w !== void 0 ? this.#w : this.#w = this.#r === "win32" && this.#n === 0 && this.length > 1 && typeof t[0] == "string" && /^[a-z]:$/i.test(t[0]);
  }
  isAbsolute() {
    let t = this.#t;
    return this.#h !== void 0 ? this.#h : this.#h = t[0] === "" && t.length > 1 || this.isDrive() || this.isUNC();
  }
  root() {
    let t = this.#t[0];
    return typeof t == "string" && this.isAbsolute() && this.#n === 0 ? t : "";
  }
  checkFollowGlobstar() {
    return !(this.#n === 0 || !this.isGlobstar() || !this.#u);
  }
  markFollowGlobstar() {
    return this.#n === 0 || !this.isGlobstar() || !this.#u ? false : (this.#u = false, true);
  }
};
var _i = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux";
var ot = class {
  relative;
  relativeChildren;
  absolute;
  absoluteChildren;
  platform;
  mmopts;
  constructor(t, { nobrace: e, nocase: s, noext: i, noglobstar: r, platform: o = _i }) {
    this.relative = [], this.absolute = [], this.relativeChildren = [], this.absoluteChildren = [], this.platform = o, this.mmopts = { dot: true, nobrace: e, nocase: s, noext: i, noglobstar: r, optimizationLevel: 2, platform: o, nocomment: true, nonegate: true };
    for (let h of t) this.add(h);
  }
  add(t) {
    let e = new D(t, this.mmopts);
    for (let s = 0; s < e.set.length; s++) {
      let i = e.set[s], r = e.globParts[s];
      if (!i || !r) throw new Error("invalid pattern object");
      for (; i[0] === "." && r[0] === "."; ) i.shift(), r.shift();
      let o = new nt(i, r, 0, this.platform), h = new D(o.globString(), this.mmopts), a = r[r.length - 1] === "**", l = o.isAbsolute();
      l ? this.absolute.push(h) : this.relative.push(h), a && (l ? this.absoluteChildren.push(h) : this.relativeChildren.push(h));
    }
  }
  ignored(t) {
    let e = t.fullpath(), s = `${e}/`, i = t.relative() || ".", r = `${i}/`;
    for (let o of this.relative) if (o.match(i) || o.match(r)) return true;
    for (let o of this.absolute) if (o.match(e) || o.match(s)) return true;
    return false;
  }
  childrenIgnored(t) {
    let e = t.fullpath() + "/", s = (t.relative() || ".") + "/";
    for (let i of this.relativeChildren) if (i.match(s)) return true;
    for (let i of this.absoluteChildren) if (i.match(e)) return true;
    return false;
  }
};
var oe = class n5 {
  store;
  constructor(t = /* @__PURE__ */ new Map()) {
    this.store = t;
  }
  copy() {
    return new n5(new Map(this.store));
  }
  hasWalked(t, e) {
    return this.store.get(t.fullpath())?.has(e.globString());
  }
  storeWalked(t, e) {
    let s = t.fullpath(), i = this.store.get(s);
    i ? i.add(e.globString()) : this.store.set(s, /* @__PURE__ */ new Set([e.globString()]));
  }
};
var he = class {
  store = /* @__PURE__ */ new Map();
  add(t, e, s) {
    let i = (e ? 2 : 0) | (s ? 1 : 0), r = this.store.get(t);
    this.store.set(t, r === void 0 ? i : i & r);
  }
  entries() {
    return [...this.store.entries()].map(([t, e]) => [t, !!(e & 2), !!(e & 1)]);
  }
};
var ae = class {
  store = /* @__PURE__ */ new Map();
  add(t, e) {
    if (!t.canReaddir()) return;
    let s = this.store.get(t);
    s ? s.find((i) => i.globString() === e.globString()) || s.push(e) : this.store.set(t, [e]);
  }
  get(t) {
    let e = this.store.get(t);
    if (!e) throw new Error("attempting to walk unknown path");
    return e;
  }
  entries() {
    return this.keys().map((t) => [t, this.store.get(t)]);
  }
  keys() {
    return [...this.store.keys()].filter((t) => t.canReaddir());
  }
};
var Et = class n6 {
  hasWalkedCache;
  matches = new he();
  subwalks = new ae();
  patterns;
  follow;
  dot;
  opts;
  constructor(t, e) {
    this.opts = t, this.follow = !!t.follow, this.dot = !!t.dot, this.hasWalkedCache = e ? e.copy() : new oe();
  }
  processPatterns(t, e) {
    this.patterns = e;
    let s = e.map((i) => [t, i]);
    for (let [i, r] of s) {
      this.hasWalkedCache.storeWalked(i, r);
      let o = r.root(), h = r.isAbsolute() && this.opts.absolute !== false;
      if (o) {
        i = i.resolve(o === "/" && this.opts.root !== void 0 ? this.opts.root : o);
        let c = r.rest();
        if (c) r = c;
        else {
          this.matches.add(i, true, false);
          continue;
        }
      }
      if (i.isENOENT()) continue;
      let a, l, u = false;
      for (; typeof (a = r.pattern()) == "string" && (l = r.rest()); ) i = i.resolve(a), r = l, u = true;
      if (a = r.pattern(), l = r.rest(), u) {
        if (this.hasWalkedCache.hasWalked(i, r)) continue;
        this.hasWalkedCache.storeWalked(i, r);
      }
      if (typeof a == "string") {
        let c = a === ".." || a === "" || a === ".";
        this.matches.add(i.resolve(a), h, c);
        continue;
      } else if (a === A) {
        (!i.isSymbolicLink() || this.follow || r.checkFollowGlobstar()) && this.subwalks.add(i, r);
        let c = l?.pattern(), d = l?.rest();
        if (!l || (c === "" || c === ".") && !d) this.matches.add(i, h, c === "" || c === ".");
        else if (c === "..") {
          let f = i.parent || i;
          d ? this.hasWalkedCache.hasWalked(f, d) || this.subwalks.add(f, d) : this.matches.add(f, h, true);
        }
      } else a instanceof RegExp && this.subwalks.add(i, r);
    }
    return this;
  }
  subwalkTargets() {
    return this.subwalks.keys();
  }
  child() {
    return new n6(this.opts, this.hasWalkedCache);
  }
  filterEntries(t, e) {
    let s = this.subwalks.get(t), i = this.child();
    for (let r of e) for (let o of s) {
      let h = o.isAbsolute(), a = o.pattern(), l = o.rest();
      a === A ? i.testGlobstar(r, o, l, h) : a instanceof RegExp ? i.testRegExp(r, a, l, h) : i.testString(r, a, l, h);
    }
    return i;
  }
  testGlobstar(t, e, s, i) {
    if ((this.dot || !t.name.startsWith(".")) && (e.hasMore() || this.matches.add(t, i, false), t.canReaddir() && (this.follow || !t.isSymbolicLink() ? this.subwalks.add(t, e) : t.isSymbolicLink() && (s && e.checkFollowGlobstar() ? this.subwalks.add(t, s) : e.markFollowGlobstar() && this.subwalks.add(t, e)))), s) {
      let r = s.pattern();
      if (typeof r == "string" && r !== ".." && r !== "" && r !== ".") this.testString(t, r, s.rest(), i);
      else if (r === "..") {
        let o = t.parent || t;
        this.subwalks.add(o, s);
      } else r instanceof RegExp && this.testRegExp(t, r, s.rest(), i);
    }
  }
  testRegExp(t, e, s, i) {
    e.test(t.name) && (s ? this.subwalks.add(t, s) : this.matches.add(t, i, false));
  }
  testString(t, e, s, i) {
    t.isNamed(e) && (s ? this.subwalks.add(t, s) : this.matches.add(t, i, false));
  }
};
var Li = (n7, t) => typeof n7 == "string" ? new ot([n7], t) : Array.isArray(n7) ? new ot(n7, t) : n7;
var zt = class {
  path;
  patterns;
  opts;
  seen = /* @__PURE__ */ new Set();
  paused = false;
  aborted = false;
  #t = [];
  #s;
  #n;
  signal;
  maxDepth;
  includeChildMatches;
  constructor(t, e, s) {
    if (this.patterns = t, this.path = e, this.opts = s, this.#n = !s.posix && s.platform === "win32" ? "\\" : "/", this.includeChildMatches = s.includeChildMatches !== false, (s.ignore || !this.includeChildMatches) && (this.#s = Li(s.ignore ?? [], s), !this.includeChildMatches && typeof this.#s.add != "function")) {
      let i = "cannot ignore child matches, ignore lacks add() method.";
      throw new Error(i);
    }
    this.maxDepth = s.maxDepth || 1 / 0, s.signal && (this.signal = s.signal, this.signal.addEventListener("abort", () => {
      this.#t.length = 0;
    }));
  }
  #r(t) {
    return this.seen.has(t) || !!this.#s?.ignored?.(t);
  }
  #o(t) {
    return !!this.#s?.childrenIgnored?.(t);
  }
  pause() {
    this.paused = true;
  }
  resume() {
    if (this.signal?.aborted) return;
    this.paused = false;
    let t;
    for (; !this.paused && (t = this.#t.shift()); ) t();
  }
  onResume(t) {
    this.signal?.aborted || (this.paused ? this.#t.push(t) : t());
  }
  async matchCheck(t, e) {
    if (e && this.opts.nodir) return;
    let s;
    if (this.opts.realpath) {
      if (s = t.realpathCached() || await t.realpath(), !s) return;
      t = s;
    }
    let r = t.isUnknown() || this.opts.stat ? await t.lstat() : t;
    if (this.opts.follow && this.opts.nodir && r?.isSymbolicLink()) {
      let o = await r.realpath();
      o && (o.isUnknown() || this.opts.stat) && await o.lstat();
    }
    return this.matchCheckTest(r, e);
  }
  matchCheckTest(t, e) {
    return t && (this.maxDepth === 1 / 0 || t.depth() <= this.maxDepth) && (!e || t.canReaddir()) && (!this.opts.nodir || !t.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !t.isSymbolicLink() || !t.realpathCached()?.isDirectory()) && !this.#r(t) ? t : void 0;
  }
  matchCheckSync(t, e) {
    if (e && this.opts.nodir) return;
    let s;
    if (this.opts.realpath) {
      if (s = t.realpathCached() || t.realpathSync(), !s) return;
      t = s;
    }
    let r = t.isUnknown() || this.opts.stat ? t.lstatSync() : t;
    if (this.opts.follow && this.opts.nodir && r?.isSymbolicLink()) {
      let o = r.realpathSync();
      o && (o?.isUnknown() || this.opts.stat) && o.lstatSync();
    }
    return this.matchCheckTest(r, e);
  }
  matchFinish(t, e) {
    if (this.#r(t)) return;
    if (!this.includeChildMatches && this.#s?.add) {
      let r = `${t.relativePosix()}/**`;
      this.#s.add(r);
    }
    let s = this.opts.absolute === void 0 ? e : this.opts.absolute;
    this.seen.add(t);
    let i = this.opts.mark && t.isDirectory() ? this.#n : "";
    if (this.opts.withFileTypes) this.matchEmit(t);
    else if (s) {
      let r = this.opts.posix ? t.fullpathPosix() : t.fullpath();
      this.matchEmit(r + i);
    } else {
      let r = this.opts.posix ? t.relativePosix() : t.relative(), o = this.opts.dotRelative && !r.startsWith(".." + this.#n) ? "." + this.#n : "";
      this.matchEmit(r ? o + r + i : "." + i);
    }
  }
  async match(t, e, s) {
    let i = await this.matchCheck(t, s);
    i && this.matchFinish(i, e);
  }
  matchSync(t, e, s) {
    let i = this.matchCheckSync(t, s);
    i && this.matchFinish(i, e);
  }
  walkCB(t, e, s) {
    this.signal?.aborted && s(), this.walkCB2(t, e, new Et(this.opts), s);
  }
  walkCB2(t, e, s, i) {
    if (this.#o(t)) return i();
    if (this.signal?.aborted && i(), this.paused) {
      this.onResume(() => this.walkCB2(t, e, s, i));
      return;
    }
    s.processPatterns(t, e);
    let r = 1, o = () => {
      --r === 0 && i();
    };
    for (let [h, a, l] of s.matches.entries()) this.#r(h) || (r++, this.match(h, a, l).then(() => o()));
    for (let h of s.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && h.depth() >= this.maxDepth) continue;
      r++;
      let a = h.readdirCached();
      h.calledReaddir() ? this.walkCB3(h, a, s, o) : h.readdirCB((l, u) => this.walkCB3(h, u, s, o), true);
    }
    o();
  }
  walkCB3(t, e, s, i) {
    s = s.filterEntries(t, e);
    let r = 1, o = () => {
      --r === 0 && i();
    };
    for (let [h, a, l] of s.matches.entries()) this.#r(h) || (r++, this.match(h, a, l).then(() => o()));
    for (let [h, a] of s.subwalks.entries()) r++, this.walkCB2(h, a, s.child(), o);
    o();
  }
  walkCBSync(t, e, s) {
    this.signal?.aborted && s(), this.walkCB2Sync(t, e, new Et(this.opts), s);
  }
  walkCB2Sync(t, e, s, i) {
    if (this.#o(t)) return i();
    if (this.signal?.aborted && i(), this.paused) {
      this.onResume(() => this.walkCB2Sync(t, e, s, i));
      return;
    }
    s.processPatterns(t, e);
    let r = 1, o = () => {
      --r === 0 && i();
    };
    for (let [h, a, l] of s.matches.entries()) this.#r(h) || this.matchSync(h, a, l);
    for (let h of s.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && h.depth() >= this.maxDepth) continue;
      r++;
      let a = h.readdirSync();
      this.walkCB3Sync(h, a, s, o);
    }
    o();
  }
  walkCB3Sync(t, e, s, i) {
    s = s.filterEntries(t, e);
    let r = 1, o = () => {
      --r === 0 && i();
    };
    for (let [h, a, l] of s.matches.entries()) this.#r(h) || this.matchSync(h, a, l);
    for (let [h, a] of s.subwalks.entries()) r++, this.walkCB2Sync(h, a, s.child(), o);
    o();
  }
};
var xt = class extends zt {
  matches = /* @__PURE__ */ new Set();
  constructor(t, e, s) {
    super(t, e, s);
  }
  matchEmit(t) {
    this.matches.add(t);
  }
  async walk() {
    if (this.signal?.aborted) throw this.signal.reason;
    return this.path.isUnknown() && await this.path.lstat(), await new Promise((t, e) => {
      this.walkCB(this.path, this.patterns, () => {
        this.signal?.aborted ? e(this.signal.reason) : t(this.matches);
      });
    }), this.matches;
  }
  walkSync() {
    if (this.signal?.aborted) throw this.signal.reason;
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => {
      if (this.signal?.aborted) throw this.signal.reason;
    }), this.matches;
  }
};
var vt = class extends zt {
  results;
  constructor(t, e, s) {
    super(t, e, s), this.results = new V({ signal: this.signal, objectMode: true }), this.results.on("drain", () => this.resume()), this.results.on("resume", () => this.resume());
  }
  matchEmit(t) {
    this.results.write(t), this.results.flowing || this.pause();
  }
  stream() {
    let t = this.path;
    return t.isUnknown() ? t.lstat().then(() => {
      this.walkCB(t, this.patterns, () => this.results.end());
    }) : this.walkCB(t, this.patterns, () => this.results.end()), this.results;
  }
  streamSync() {
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => this.results.end()), this.results;
  }
};
var Pi = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux";
var I = class {
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
  opts;
  patterns;
  constructor(t, e) {
    if (!e) throw new TypeError("glob options required");
    if (this.withFileTypes = !!e.withFileTypes, this.signal = e.signal, this.follow = !!e.follow, this.dot = !!e.dot, this.dotRelative = !!e.dotRelative, this.nodir = !!e.nodir, this.mark = !!e.mark, e.cwd ? (e.cwd instanceof URL || e.cwd.startsWith("file://")) && (e.cwd = (0, import_node_url.fileURLToPath)(e.cwd)) : this.cwd = "", this.cwd = e.cwd || "", this.root = e.root, this.magicalBraces = !!e.magicalBraces, this.nobrace = !!e.nobrace, this.noext = !!e.noext, this.realpath = !!e.realpath, this.absolute = e.absolute, this.includeChildMatches = e.includeChildMatches !== false, this.noglobstar = !!e.noglobstar, this.matchBase = !!e.matchBase, this.maxDepth = typeof e.maxDepth == "number" ? e.maxDepth : 1 / 0, this.stat = !!e.stat, this.ignore = e.ignore, this.withFileTypes && this.absolute !== void 0) throw new Error("cannot set absolute and withFileTypes:true");
    if (typeof t == "string" && (t = [t]), this.windowsPathsNoEscape = !!e.windowsPathsNoEscape || e.allowWindowsEscape === false, this.windowsPathsNoEscape && (t = t.map((a) => a.replace(/\\/g, "/"))), this.matchBase) {
      if (e.noglobstar) throw new TypeError("base matching requires globstar");
      t = t.map((a) => a.includes("/") ? a : `./**/${a}`);
    }
    if (this.pattern = t, this.platform = e.platform || Pi, this.opts = { ...e, platform: this.platform }, e.scurry) {
      if (this.scurry = e.scurry, e.nocase !== void 0 && e.nocase !== e.scurry.nocase) throw new Error("nocase option contradicts provided scurry option");
    } else {
      let a = e.platform === "win32" ? it : e.platform === "darwin" ? St : e.platform ? rt : Xe;
      this.scurry = new a(this.cwd, { nocase: e.nocase, fs: e.fs });
    }
    this.nocase = this.scurry.nocase;
    let s = this.platform === "darwin" || this.platform === "win32", i = { braceExpandMax: 1e4, ...e, dot: this.dot, matchBase: this.matchBase, nobrace: this.nobrace, nocase: this.nocase, nocaseMagicOnly: s, nocomment: true, noext: this.noext, nonegate: true, optimizationLevel: 2, platform: this.platform, windowsPathsNoEscape: this.windowsPathsNoEscape, debug: !!this.opts.debug }, r = this.pattern.map((a) => new D(a, i)), [o, h] = r.reduce((a, l) => (a[0].push(...l.set), a[1].push(...l.globParts), a), [[], []]);
    this.patterns = o.map((a, l) => {
      let u = h[l];
      if (!u) throw new Error("invalid pattern object");
      return new nt(a, u, 0, this.platform);
    });
  }
  async walk() {
    return [...await new xt(this.patterns, this.scurry.cwd, { ...this.opts, maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0, platform: this.platform, nocase: this.nocase, includeChildMatches: this.includeChildMatches }).walk()];
  }
  walkSync() {
    return [...new xt(this.patterns, this.scurry.cwd, { ...this.opts, maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0, platform: this.platform, nocase: this.nocase, includeChildMatches: this.includeChildMatches }).walkSync()];
  }
  stream() {
    return new vt(this.patterns, this.scurry.cwd, { ...this.opts, maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0, platform: this.platform, nocase: this.nocase, includeChildMatches: this.includeChildMatches }).stream();
  }
  streamSync() {
    return new vt(this.patterns, this.scurry.cwd, { ...this.opts, maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0, platform: this.platform, nocase: this.nocase, includeChildMatches: this.includeChildMatches }).streamSync();
  }
  iterateSync() {
    return this.streamSync()[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  iterate() {
    return this.stream()[Symbol.asyncIterator]();
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
};
var le = (n7, t = {}) => {
  Array.isArray(n7) || (n7 = [n7]);
  for (let e of n7) if (new D(e, t).hasMagic()) return true;
  return false;
};
function Bt(n7, t = {}) {
  return new I(n7, t).streamSync();
}
function Qe(n7, t = {}) {
  return new I(n7, t).stream();
}
function ts(n7, t = {}) {
  return new I(n7, t).walkSync();
}
async function Je(n7, t = {}) {
  return new I(n7, t).walk();
}
function Ut(n7, t = {}) {
  return new I(n7, t).iterateSync();
}
function es(n7, t = {}) {
  return new I(n7, t).iterate();
}
var ji = Bt;
var Ii = Object.assign(Qe, { sync: Bt });
var zi = Ut;
var Bi = Object.assign(es, { sync: Ut });
var Ui = Object.assign(ts, { stream: Bt, iterate: Ut });
var Ze = Object.assign(Je, { glob: Je, globSync: ts, sync: Ui, globStream: Qe, stream: Ii, globStreamSync: Bt, streamSync: ji, globIterate: es, iterate: Bi, globIterateSync: Ut, iterateSync: zi, Glob: I, hasMagic: le, escape: tt, unescape: W });
Ze.glob = Ze;

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
function addCdsIndexerDiagnostic(projectDir, errorMessage, codeqlExePath2, sourceRoot2) {
  return addDiagnostic(
    projectDir,
    errorMessage,
    codeqlExePath2,
    "cds/indexer-failure",
    "Failure running @sap/cds-indexer for a SAP CAP CDS project",
    "warning" /* Warning */,
    "project directory",
    sourceRoot2
  );
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
  const parsedVersions = availableVersions.map((v2) => parseSemanticVersion(v2)).filter((v2) => v2 !== null);
  if (parsedVersions.length === 0) {
    return null;
  }
  const satisfyingVersions = parsedVersions.filter((v2) => satisfiesRange(v2, requiredVersion));
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
      versionArray = versions.filter((v2) => typeof v2 === "string");
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
function findNearestNpmrc(startDir) {
  let current = (0, import_path7.resolve)(startDir);
  while (true) {
    const candidate = (0, import_path7.join)(current, ".npmrc");
    if ((0, import_fs5.existsSync)(candidate)) {
      return candidate;
    }
    const parent = (0, import_path7.dirname)(current);
    if (parent === current) {
      return void 0;
    }
    current = parent;
  }
}
function copyNpmrcToCache(cacheDir, projectDir) {
  const npmrcPath = findNearestNpmrc(projectDir);
  if (!npmrcPath) {
    return;
  }
  const dest = (0, import_path7.join)(cacheDir, ".npmrc");
  try {
    (0, import_fs5.copyFileSync)(npmrcPath, dest);
    cdsExtractorLog("info", `Copied .npmrc from '${npmrcPath}' to cache directory '${cacheDir}'`);
  } catch (err) {
    cdsExtractorLog(
      "warn",
      `Failed to copy .npmrc to cache directory: ${err instanceof Error ? err.message : String(err)}`
    );
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
    const indexerNote = combination.cdsIndexerVersion ? `, @sap/cds-indexer@${combination.cdsIndexerVersion}` : "";
    cdsExtractorLog(
      "info",
      `Dependency combination ${hash.substring(0, 8)}: @sap/cds@${actualCdsVersion}, @sap/cds-dk@${actualCdsDkVersion}${indexerNote}${fallbackNote}`
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
      const cacheDeps = {
        "@sap/cds": actualCdsVersion,
        "@sap/cds-dk": actualCdsDkVersion
      };
      if (combination.cdsIndexerVersion) {
        cacheDeps["@sap/cds-indexer"] = combination.cdsIndexerVersion;
        cdsExtractorLog(
          "info",
          `Including @sap/cds-indexer@${combination.cdsIndexerVersion} in cache for combination ${hash.substring(0, 8)}`
        );
      }
      const packageJson = {
        name: `cds-extractor-cache-${hash}`,
        version: "1.0.0",
        private: true,
        dependencies: cacheDeps
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
    const npmrcProjectDir = Array.from(dependencyGraph2.projects.values()).map((project) => project.projectDir).find((projectDir) => projectDir && (0, import_fs5.existsSync)((0, import_path7.join)(sourceRoot2, projectDir, ".npmrc")));
    if (npmrcProjectDir) {
      copyNpmrcToCache(cacheDir, (0, import_path7.join)(sourceRoot2, npmrcProjectDir));
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
      const p_cdsIndexerVersion = project.packageJson.dependencies?.["@sap/cds-indexer"] ?? project.packageJson.devDependencies?.["@sap/cds-indexer"] ?? void 0;
      const projectResolvedVersions = resolveCdsVersions2(p_cdsVersion, p_cdsDkVersion);
      const projectActualCdsVersion = projectResolvedVersions.resolvedCdsVersion ?? p_cdsVersion;
      const projectActualCdsDkVersion = projectResolvedVersions.resolvedCdsDkVersion ?? p_cdsDkVersion;
      const combinationActualCdsVersion = combination.resolvedCdsVersion ?? combination.cdsVersion;
      const combinationActualCdsDkVersion = combination.resolvedCdsDkVersion ?? combination.cdsDkVersion;
      if (projectActualCdsVersion === combinationActualCdsVersion && projectActualCdsDkVersion === combinationActualCdsDkVersion && p_cdsIndexerVersion === combination.cdsIndexerVersion) {
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
    const cdsIndexerVersion = project.packageJson.dependencies?.["@sap/cds-indexer"] ?? project.packageJson.devDependencies?.["@sap/cds-indexer"] ?? void 0;
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
    const hashInput = cdsIndexerVersion ? `${actualCdsVersion}|${actualCdsDkVersion}|${cdsIndexerVersion}` : `${actualCdsVersion}|${actualCdsDkVersion}`;
    const hash = (0, import_crypto.createHash)("sha256").update(hashInput).digest("hex");
    if (!combinations.has(hash)) {
      combinations.set(hash, {
        cdsVersion,
        cdsDkVersion,
        cdsIndexerVersion,
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
function createCompilationTask(type2, sourceFiles, expectedOutputFile, projectDir) {
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
    id: `${type2}_${projectDir}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: type2,
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

// src/cds/indexer.ts
var import_child_process8 = require("child_process");
var import_path10 = require("path");
var CDS_INDEXER_TIMEOUT_MS = 6e5;
var CDS_INDEXER_PACKAGE = "@sap/cds-indexer";
function projectUsesCdsIndexer(project) {
  if (!project.packageJson) {
    return false;
  }
  const inDeps = project.packageJson.dependencies?.[CDS_INDEXER_PACKAGE] !== void 0;
  const inDevDeps = project.packageJson.devDependencies?.[CDS_INDEXER_PACKAGE] !== void 0;
  return inDeps || inDevDeps;
}
function runCdsIndexer(project, sourceRoot2, cacheDir) {
  const projectAbsPath = (0, import_path10.join)(sourceRoot2, project.projectDir);
  const startTime = Date.now();
  const result = {
    success: false,
    projectDir: project.projectDir,
    durationMs: 0,
    timedOut: false
  };
  try {
    const nodePaths = [];
    if (cacheDir) {
      nodePaths.push((0, import_path10.join)(cacheDir, "node_modules"));
    }
    nodePaths.push((0, import_path10.join)(projectAbsPath, "node_modules"));
    const env = {
      ...process.env,
      NODE_PATH: nodePaths.join(import_path10.delimiter)
    };
    cdsExtractorLog(
      "info",
      `Running ${CDS_INDEXER_PACKAGE} for project '${project.projectDir}'...`
    );
    const spawnResult = (0, import_child_process8.spawnSync)("npx", ["--yes", CDS_INDEXER_PACKAGE], {
      cwd: projectAbsPath,
      env,
      stdio: "pipe",
      timeout: CDS_INDEXER_TIMEOUT_MS
    });
    result.durationMs = Date.now() - startTime;
    if (spawnResult.signal === "SIGTERM" || spawnResult.signal === "SIGKILL") {
      result.timedOut = true;
      result.error = `${CDS_INDEXER_PACKAGE} timed out after ${CDS_INDEXER_TIMEOUT_MS}ms for project '${project.projectDir}'`;
      cdsExtractorLog("warn", result.error);
      return result;
    }
    if (spawnResult.error) {
      result.error = `${CDS_INDEXER_PACKAGE} failed to start for project '${project.projectDir}': ${String(spawnResult.error)}`;
      cdsExtractorLog("warn", result.error);
      return result;
    }
    if (spawnResult.status !== 0) {
      const stderr = spawnResult.stderr?.toString().trim() ?? "";
      const stdout = spawnResult.stdout?.toString().trim() ?? "";
      const output = stderr || stdout || "unknown error";
      result.error = `${CDS_INDEXER_PACKAGE} failed for project '${project.projectDir}' (exit code ${spawnResult.status}): ${output}`;
      cdsExtractorLog("warn", result.error);
      return result;
    }
    result.success = true;
    cdsExtractorLog(
      "info",
      `Successfully ran ${CDS_INDEXER_PACKAGE} for project '${project.projectDir}' (${result.durationMs}ms)`
    );
  } catch (error) {
    result.durationMs = Date.now() - startTime;
    result.error = `${CDS_INDEXER_PACKAGE} threw an unexpected error for project '${project.projectDir}': ${String(error)}`;
    cdsExtractorLog("error", result.error);
  }
  return result;
}
function orchestrateCdsIndexer(dependencyGraph2, sourceRoot2, projectCacheDirMap2, codeqlExePath2) {
  const summary = {
    totalProjects: dependencyGraph2.projects.size,
    projectsRequiringIndexer: 0,
    successfulRuns: 0,
    failedRuns: 0,
    results: []
  };
  for (const [projectDir, project] of dependencyGraph2.projects.entries()) {
    if (!projectUsesCdsIndexer(project)) {
      continue;
    }
    summary.projectsRequiringIndexer++;
    const cacheDir = projectCacheDirMap2.get(projectDir);
    const result = runCdsIndexer(project, sourceRoot2, cacheDir);
    summary.results.push(result);
    if (result.success) {
      summary.successfulRuns++;
      const installResult = projectInstallDependencies(project, sourceRoot2);
      if (!installResult.success) {
        cdsExtractorLog(
          "warn",
          `Full dependency installation failed for project '${projectDir}' after successful cds-indexer run: ${installResult.error ?? "unknown error"}`
        );
      }
    } else {
      summary.failedRuns++;
      if (codeqlExePath2) {
        addCdsIndexerDiagnostic(
          projectDir,
          result.error ?? `${CDS_INDEXER_PACKAGE} failed for project '${projectDir}'`,
          codeqlExePath2,
          sourceRoot2
        );
      }
    }
  }
  if (summary.projectsRequiringIndexer > 0) {
    cdsExtractorLog(
      "info",
      `CDS indexer summary: ${summary.projectsRequiringIndexer} project(s) required indexer, ${summary.successfulRuns} succeeded, ${summary.failedRuns} failed`
    );
  } else {
    cdsExtractorLog("info", "No projects require @sap/cds-indexer.");
  }
  return summary;
}

// src/cds/parser/graph.ts
var import_path13 = require("path");

// src/cds/parser/functions.ts
var import_fs7 = require("fs");
var import_path12 = require("path");

// src/paths-ignore.ts
var import_fs6 = require("fs");
var import_path11 = require("path");

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re2 = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match2;
  var foundLineNo = -1;
  while (match2 = re2.exec(mark.buffer)) {
    lineEnds.push(match2.index);
    lineStarts.push(match2.index + match2[0].length);
    if (mark.position <= match2.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match2, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match2 = YAML_DATE_REGEXP.exec(data);
  if (match2 === null) match2 = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match2 === null) throw new Error("Date resolve error");
  year = +match2[1];
  month = +match2[2] - 1;
  day = +match2[3];
  if (!match2[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match2[4];
  minute = +match2[5];
  second = +match2[6];
  if (match2[7]) {
    fraction = match2[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match2[9]) {
    tz_hour = +match2[10];
    tz_minute = +(match2[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match2[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match2, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match2 = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match2 === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match2[1], 10);
    minor = parseInt(match2[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = (function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  })();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = (function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  })();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match2;
  while (match2 = lineRe.exec(string)) {
    var prefix = match2[1], line = match2[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match2;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match2 = breakRe.exec(line)) {
    next = match2.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");

// node_modules/brace-expansion/node_modules/balanced-match/dist/esm/index.js
var balanced = (a, b, str2) => {
  const ma = a instanceof RegExp ? maybeMatch(a, str2) : a;
  const mb = b instanceof RegExp ? maybeMatch(b, str2) : b;
  const r = ma !== null && mb != null && range(ma, mb, str2);
  return r && {
    start: r[0],
    end: r[1],
    pre: str2.slice(0, r[0]),
    body: str2.slice(r[0] + ma.length, r[1]),
    post: str2.slice(r[1] + mb.length)
  };
};
var maybeMatch = (reg, str2) => {
  const m = str2.match(reg);
  return m ? m[0] : null;
};
var range = (a, b, str2) => {
  let begs, beg, left, right = void 0, result;
  let ai2 = str2.indexOf(a);
  let bi2 = str2.indexOf(b, ai2 + 1);
  let i = ai2;
  if (ai2 >= 0 && bi2 > 0) {
    if (a === b) {
      return [ai2, bi2];
    }
    begs = [];
    left = str2.length;
    while (i >= 0 && !result) {
      if (i === ai2) {
        begs.push(i);
        ai2 = str2.indexOf(a, i + 1);
      } else if (begs.length === 1) {
        const r = begs.pop();
        if (r !== void 0)
          result = [r, bi2];
      } else {
        beg = begs.pop();
        if (beg !== void 0 && beg < left) {
          left = beg;
          right = bi2;
        }
        bi2 = str2.indexOf(b, i + 1);
      }
      i = ai2 < bi2 && ai2 >= 0 ? ai2 : bi2;
    }
    if (begs.length && right !== void 0) {
      result = [left, right];
    }
  }
  return result;
};

// node_modules/brace-expansion/dist/esm/index.js
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
var periodPattern = /\\\./g;
var EXPANSION_MAX = 1e5;
function numeric(str2) {
  return !isNaN(str2) ? parseInt(str2, 10) : str2.charCodeAt(0);
}
function escapeBraces(str2) {
  return str2.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str2) {
  return str2.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function parseCommaParts(str2) {
  if (!str2) {
    return [""];
  }
  const parts = [];
  const m = balanced("{", "}", str2);
  if (!m) {
    return str2.split(",");
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
function expand(str2, options = {}) {
  if (!str2) {
    return [];
  }
  const { max = EXPANSION_MAX } = options;
  if (str2.slice(0, 2) === "{}") {
    str2 = "\\{\\}" + str2.slice(2);
  }
  return expand_(escapeBraces(str2), max, true).map(unescapeBraces);
}
function embrace(str2) {
  return "{" + str2 + "}";
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
function expand_(str2, max, isTop) {
  const expansions = [];
  const m = balanced("{", "}", str2);
  if (!m)
    return [str2];
  const pre = m.pre;
  const post = m.post.length ? expand_(m.post, max, false) : [""];
  if (/\$$/.test(m.pre)) {
    for (let k2 = 0; k2 < post.length && k2 < max; k2++) {
      const expansion = pre + "{" + m.body + "}" + post[k2];
      expansions.push(expansion);
    }
  } else {
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m.post.match(/,(?!,).*\}/)) {
        str2 = m.pre + "{" + m.body + escClose + m.post;
        return expand_(str2, max, true);
      }
      return [str2];
    }
    let n7;
    if (isSequence) {
      n7 = m.body.split(/\.\./);
    } else {
      n7 = parseCommaParts(m.body);
      if (n7.length === 1 && n7[0] !== void 0) {
        n7 = expand_(n7[0], max, false).map(embrace);
        if (n7.length === 1) {
          return post.map((p) => m.pre + n7[0] + p);
        }
      }
    }
    let N2;
    if (isSequence && n7[0] !== void 0 && n7[1] !== void 0) {
      const x2 = numeric(n7[0]);
      const y = numeric(n7[1]);
      const width = Math.max(n7[0].length, n7[1].length);
      let incr = n7.length === 3 && n7[2] !== void 0 ? Math.max(Math.abs(numeric(n7[2])), 1) : 1;
      let test = lte;
      const reverse = y < x2;
      if (reverse) {
        incr *= -1;
        test = gte;
      }
      const pad = n7.some(isPadded);
      N2 = [];
      for (let i = x2; test(i, y); i += incr) {
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
        N2.push(c);
      }
    } else {
      N2 = [];
      for (let j2 = 0; j2 < n7.length; j2++) {
        N2.push.apply(N2, expand_(n7[j2], max, false));
      }
    }
    for (let j2 = 0; j2 < N2.length; j2++) {
      for (let k2 = 0; k2 < post.length && expansions.length < max; k2++) {
        const expansion = pre + N2[j2] + post[k2];
        if (!isTop || isSequence || expansion) {
          expansions.push(expansion);
        }
      }
    }
  }
  return expansions;
}

// node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/minimatch/dist/esm/brace-expressions.js
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
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
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
  WHILE: while (i < glob.length) {
    const c = glob.charAt(i);
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
        if (glob.startsWith(cls, i)) {
          if (rangeStart) {
            return ["$.", false, glob.length - pos, true];
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
    if (glob.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-"));
      i += 2;
      continue;
    }
    if (glob.startsWith("-", i + 1)) {
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
    return ["$.", false, glob.length - pos, true];
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

// node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
  }
  return windowsPathsNoEscape ? s.replace(/\[([^\/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\{}])\]/g, "$1$2").replace(/\\([^\/{}])/g, "$1");
};

// node_modules/minimatch/dist/esm/ast.js
var _a;
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var isExtglobAST = (c) => isExtglobType(c.type);
var adoptionMap = /* @__PURE__ */ new Map([
  ["!", ["@"]],
  ["?", ["?", "@"]],
  ["@", ["@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@"]]
]);
var adoptionWithSpaceMap = /* @__PURE__ */ new Map([
  ["!", ["?"]],
  ["@", ["?"]],
  ["+", ["?", "*"]]
]);
var adoptionAnyMap = /* @__PURE__ */ new Map([
  ["!", ["?", "@"]],
  ["?", ["?", "@"]],
  ["@", ["?", "@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@", "?", "*"]]
]);
var usurpMap = /* @__PURE__ */ new Map([
  ["!", /* @__PURE__ */ new Map([["!", "@"]])],
  [
    "?",
    /* @__PURE__ */ new Map([
      ["*", "*"],
      ["+", "*"]
    ])
  ],
  [
    "@",
    /* @__PURE__ */ new Map([
      ["!", "!"],
      ["?", "?"],
      ["@", "@"],
      ["*", "*"],
      ["+", "+"]
    ])
  ],
  [
    "+",
    /* @__PURE__ */ new Map([
      ["?", "*"],
      ["*", "*"]
    ])
  ]
]);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var ID = 0;
var AST = class {
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
  id = ++ID;
  get depth() {
    return (this.#parent?.depth ?? -1) + 1;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      "@@type": "AST",
      id: this.id,
      type: this.type,
      root: this.#root.id,
      parent: this.#parent?.id,
      depth: this.depth,
      partsLength: this.#parts.length,
      parts: this.#parts
    };
  }
  constructor(type2, parent, options = {}) {
    this.type = type2;
    if (type2)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type2 === "!" && !this.#root.#filledNegs)
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
    let n7;
    while (n7 = this.#negs.pop()) {
      if (n7.type !== "!")
        continue;
      let p = n7;
      let pp = p.#parent;
      while (pp) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
          for (const part of n7.#parts) {
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
      if (typeof p !== "string" && !(p instanceof _a && p.#parent === this)) {
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
      if (!(pp instanceof _a && pp.type === "!")) {
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
    const c = new _a(this.type, parent);
    for (const p of this.#parts) {
      c.copyIn(p);
    }
    return c;
  }
  static #parseAST(str2, ast, pos, opt, extDepth) {
    const maxDepth = opt.maxExtglobRecursion ?? 2;
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i2 = pos;
      let acc2 = "";
      while (i2 < str2.length) {
        const c = str2.charAt(i2++);
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
        const doRecurse = !opt.noext && isExtglobType(c) && str2.charAt(i2) === "(" && extDepth <= maxDepth;
        if (doRecurse) {
          ast.push(acc2);
          acc2 = "";
          const ext2 = new _a(c, ast);
          i2 = _a.#parseAST(str2, ext2, i2, opt, extDepth + 1);
          ast.push(ext2);
          continue;
        }
        acc2 += c;
      }
      ast.push(acc2);
      return i2;
    }
    let i = pos + 1;
    let part = new _a(null, ast);
    const parts = [];
    let acc = "";
    while (i < str2.length) {
      const c = str2.charAt(i++);
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
      const doRecurse = !opt.noext && isExtglobType(c) && str2.charAt(i) === "(" && /* c8 ignore start - the maxDepth is sufficient here */
      (extDepth <= maxDepth || ast && ast.#canAdoptType(c));
      if (doRecurse) {
        const depthAdd = ast && ast.#canAdoptType(c) ? 0 : 1;
        part.push(acc);
        acc = "";
        const ext2 = new _a(c, part);
        part.push(ext2);
        i = _a.#parseAST(str2, ext2, i, opt, extDepth + depthAdd);
        continue;
      }
      if (c === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new _a(null, ast);
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
    ast.#parts = [str2.substring(pos - 1)];
    return i;
  }
  #canAdoptWithSpace(child) {
    return this.#canAdopt(child, adoptionWithSpaceMap);
  }
  #canAdopt(child, map2 = adoptionMap) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canAdoptType(gc.type, map2);
  }
  #canAdoptType(c, map2 = adoptionAnyMap) {
    return !!map2.get(this.type)?.includes(c);
  }
  #adoptWithSpace(child, index) {
    const gc = child.#parts[0];
    const blank = new _a(null, gc, this.options);
    blank.#parts.push("");
    gc.push(blank);
    this.#adopt(child, index);
  }
  #adopt(child, index) {
    const gc = child.#parts[0];
    this.#parts.splice(index, 1, ...gc.#parts);
    for (const p of gc.#parts) {
      if (typeof p === "object")
        p.#parent = this;
    }
    this.#toString = void 0;
  }
  #canUsurpType(c) {
    const m = usurpMap.get(this.type);
    return !!m?.has(c);
  }
  #canUsurp(child) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null || this.#parts.length !== 1) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canUsurpType(gc.type);
  }
  #usurp(child) {
    const m = usurpMap.get(this.type);
    const gc = child.#parts[0];
    const nt2 = m?.get(gc.type);
    if (!nt2)
      return false;
    this.#parts = gc.#parts;
    for (const p of this.#parts) {
      if (typeof p === "object") {
        p.#parent = this;
      }
    }
    this.type = nt2;
    this.#toString = void 0;
    this.#emptyExt = false;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new _a(null, void 0, options);
    _a.#parseAST(pattern, ast, 0, options, 0);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob = this.toString();
    const [re2, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re2}$`, flags), {
      _src: re2,
      _glob: glob
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
    if (this.#root === this) {
      this.#flatten();
      this.#fillNegs();
    }
    if (!isExtglobAST(this)) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s) => typeof s !== "string");
      const src = this.#parts.map((p) => {
        const [re2, _2, hasMagic, uflag] = typeof p === "string" ? _a.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic;
        this.#uflag = this.#uflag || uflag;
        return re2;
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
      const me2 = this;
      me2.#parts = [s];
      me2.type = null;
      me2.#hasMagic = void 0;
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
  #flatten() {
    if (!isExtglobAST(this)) {
      for (const p of this.#parts) {
        if (typeof p === "object") {
          p.#flatten();
        }
      }
    } else {
      let iterations = 0;
      let done = false;
      do {
        done = true;
        for (let i = 0; i < this.#parts.length; i++) {
          const c = this.#parts[i];
          if (typeof c === "object") {
            c.#flatten();
            if (this.#canAdopt(c)) {
              done = false;
              this.#adopt(c, i);
            } else if (this.#canAdoptWithSpace(c)) {
              done = false;
              this.#adoptWithSpace(c, i);
            } else if (this.#canUsurp(c)) {
              done = false;
              this.#usurp(c);
            }
          }
        }
      } while (!done && ++iterations < 10);
    }
    this.#toString = void 0;
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re2, _2, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re2;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob, hasMagic, noEmpty = false) {
    let escaping = false;
    let re2 = "";
    let uflag = false;
    let inStar = false;
    for (let i = 0; i < glob.length; i++) {
      const c = glob.charAt(i);
      if (escaping) {
        escaping = false;
        re2 += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "*") {
        if (inStar)
          continue;
        inStar = true;
        re2 += noEmpty && /^[*]+$/.test(glob) ? starNoEmpty : star;
        hasMagic = true;
        continue;
      } else {
        inStar = false;
      }
      if (c === "\\") {
        if (i === glob.length - 1) {
          re2 += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c === "[") {
        const [src, needUflag, consumed, magic] = parseClass(glob, i);
        if (consumed) {
          re2 += src;
          uflag = uflag || needUflag;
          i += consumed - 1;
          hasMagic = hasMagic || magic;
          continue;
        }
      }
      if (c === "?") {
        re2 += qmark;
        hasMagic = true;
        continue;
      }
      re2 += regExpEscape(c);
    }
    return [re2, unescape(glob), !!hasMagic, uflag];
  }
};
_a = AST;

// node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/minimatch/dist/esm/index.js
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
var sep2 = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep2;
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
      constructor(type2, parent, options = {}) {
        super(type2, parent, ext(def, options));
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
  return expand(pattern, { max: options.braceExpandMax });
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
  maxGlobstarRecursion;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    const awe = "allowWindowsEscape";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options[awe] === false;
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
  debug(..._2) {
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
    let set2 = this.globParts.map((s, _2, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [
            ...s.slice(0, 4),
            ...s.slice(4).map((ss2) => this.parse(ss2))
          ];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss2) => this.parse(ss2))];
        }
      }
      return s.map((ss2) => this.parse(ss2));
    });
    this.debug(this.pattern, set2);
    this.set = set2.filter((s) => s.indexOf(false) === -1);
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
        for (let j2 = 0; j2 < globParts[i].length; j2++) {
          if (globParts[i][j2] === "**") {
            globParts[i][j2] = "*";
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
      let gs2 = -1;
      while (-1 !== (gs2 = parts.indexOf("**", gs2 + 1))) {
        let i = gs2;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs2) {
          parts.splice(gs2, i - gs2);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set2, part) => {
        const prev = set2[set2.length - 1];
        if (part === "**" && prev === "**") {
          return set2;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set2.pop();
            return set2;
          }
        }
        set2.push(part);
        return set2;
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
        let gs2 = -1;
        while (-1 !== (gs2 = parts.indexOf("**", gs2 + 1))) {
          let gss = gs2;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs2) {
            parts.splice(gs2 + 1, gss - gs2);
          }
          let next = parts[gs2 + 1];
          const p = parts[gs2 + 2];
          const p2 = parts[gs2 + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs2, 1);
          const other = parts.slice(0);
          other[gs2] = "**";
          globParts.push(other);
          gs2--;
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
      for (let j2 = i + 1; j2 < globParts.length; j2++) {
        const matched = this.partsMatch(globParts[i], globParts[j2], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j2] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs2) => gs2.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai2 = 0;
    let bi2 = 0;
    let result = [];
    let which = "";
    while (ai2 < a.length && bi2 < b.length) {
      if (a[ai2] === b[bi2]) {
        result.push(which === "b" ? b[bi2] : a[ai2]);
        ai2++;
        bi2++;
      } else if (emptyGSMatch && a[ai2] === "**" && b[bi2] === a[ai2 + 1]) {
        result.push(a[ai2]);
        ai2++;
      } else if (emptyGSMatch && b[bi2] === "**" && a[ai2] === b[bi2 + 1]) {
        result.push(b[bi2]);
        bi2++;
      } else if (a[ai2] === "*" && b[bi2] && (this.options.dot || !b[bi2].startsWith(".")) && b[bi2] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai2]);
        ai2++;
        bi2++;
      } else if (b[bi2] === "*" && a[ai2] && (this.options.dot || !a[ai2].startsWith(".")) && a[ai2] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi2]);
        ai2++;
        bi2++;
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
    let fileStartIndex = 0;
    let patternStartIndex = 0;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [
          file[fdi],
          pattern[pdi]
        ];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          patternStartIndex = pdi;
          fileStartIndex = fdi;
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    if (pattern.includes(GLOBSTAR)) {
      return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
    }
    return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
  }
  #matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
    const firstgs = pattern.indexOf(GLOBSTAR, patternIndex);
    const lastgs = pattern.lastIndexOf(GLOBSTAR);
    const [head, body, tail] = partial ? [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1),
      []
    ] : [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1, lastgs),
      pattern.slice(lastgs + 1)
    ];
    if (head.length) {
      const fileHead = file.slice(fileIndex, fileIndex + head.length);
      if (!this.#matchOne(fileHead, head, partial, 0, 0)) {
        return false;
      }
      fileIndex += head.length;
      patternIndex += head.length;
    }
    let fileTailMatch = 0;
    if (tail.length) {
      if (tail.length + fileIndex > file.length)
        return false;
      let tailStart = file.length - tail.length;
      if (this.#matchOne(file, tail, partial, tailStart, 0)) {
        fileTailMatch = tail.length;
      } else {
        if (file[file.length - 1] !== "" || fileIndex + tail.length === file.length) {
          return false;
        }
        tailStart--;
        if (!this.#matchOne(file, tail, partial, tailStart, 0)) {
          return false;
        }
        fileTailMatch = tail.length + 1;
      }
    }
    if (!body.length) {
      let sawSome = !!fileTailMatch;
      for (let i2 = fileIndex; i2 < file.length - fileTailMatch; i2++) {
        const f = String(file[i2]);
        sawSome = true;
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return partial || sawSome;
    }
    const bodySegments = [[[], 0]];
    let currentBody = bodySegments[0];
    let nonGsParts = 0;
    const nonGsPartsSums = [0];
    for (const b of body) {
      if (b === GLOBSTAR) {
        nonGsPartsSums.push(nonGsParts);
        currentBody = [[], 0];
        bodySegments.push(currentBody);
      } else {
        currentBody[0].push(b);
        nonGsParts++;
      }
    }
    let i = bodySegments.length - 1;
    const fileLength = file.length - fileTailMatch;
    for (const b of bodySegments) {
      b[1] = fileLength - (nonGsPartsSums[i--] + b[0].length);
    }
    return !!this.#matchGlobStarBodySections(file, bodySegments, fileIndex, 0, partial, 0, !!fileTailMatch);
  }
  // return false for "nope, not matching"
  // return null for "not matching, cannot keep trying"
  #matchGlobStarBodySections(file, bodySegments, fileIndex, bodyIndex, partial, globStarDepth, sawTail) {
    const bs2 = bodySegments[bodyIndex];
    if (!bs2) {
      for (let i = fileIndex; i < file.length; i++) {
        sawTail = true;
        const f = file[i];
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return sawTail;
    }
    const [body, after] = bs2;
    while (fileIndex <= after) {
      const m = this.#matchOne(file.slice(0, fileIndex + body.length), body, partial, fileIndex, 0);
      if (m && globStarDepth < this.maxGlobstarRecursion) {
        const sub = this.#matchGlobStarBodySections(file, bodySegments, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail);
        if (sub !== false) {
          return sub;
        }
      }
      const f = file[fileIndex];
      if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
        return false;
      }
      fileIndex++;
    }
    return partial || null;
  }
  #matchOne(file, pattern, partial, fileIndex, patternIndex) {
    let fi2;
    let pi2;
    let pl;
    let fl;
    for (fi2 = fileIndex, pi2 = patternIndex, fl = file.length, pl = pattern.length; fi2 < fl && pi2 < pl; fi2++, pi2++) {
      this.debug("matchOne loop");
      let p = pattern[pi2];
      let f = file[fi2];
      this.debug(pattern, p, f);
      if (p === false || p === GLOBSTAR) {
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
    if (fi2 === fl && pi2 === pl) {
      return true;
    } else if (fi2 === fl) {
      return partial;
    } else if (pi2 === pl) {
      return fi2 === fl - 1 && file[fi2] === "";
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
    const re2 = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re2 === "object") {
      Reflect.defineProperty(re2, "test", { value: fastTest });
    }
    return re2;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set2 = this.set;
    if (!set2.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re2 = set2.map((pattern) => {
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
    const [open, close] = set2.length > 1 ? ["(?:", ")"] : ["", ""];
    re2 = "^" + open + re2 + close + "$";
    if (this.partial) {
      re2 = "^(?:\\/|" + open + re2.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re2 = "^(?!" + re2 + ").+$";
    try {
      this.regexp = new RegExp(re2, [...flags].join(""));
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
    const set2 = this.set;
    this.debug(this.pattern, "set", set2);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (let i = 0; i < set2.length; i++) {
      const pattern = set2[i];
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

// src/paths-ignore.ts
var DEFAULT_CONFIG_RELATIVE_PATHS = [
  ".github/codeql/codeql-config.yml",
  ".github/codeql/codeql-config.yaml"
];
var patternsCache = /* @__PURE__ */ new Map();
function findCodeqlConfigFile(sourceRoot2) {
  const envConfigPath = process.env.CODEQL_CONFIG_PATH;
  if (envConfigPath) {
    const resolvedRoot = (0, import_path11.resolve)(sourceRoot2);
    const fullPath = (0, import_path11.resolve)(resolvedRoot, envConfigPath);
    const rel = (0, import_path11.relative)(resolvedRoot, fullPath);
    if (rel.startsWith("..") || (0, import_path11.resolve)(resolvedRoot, rel) !== fullPath) {
      cdsExtractorLog(
        "warn",
        `CODEQL_CONFIG_PATH '${envConfigPath}' resolves outside the source root. Ignoring.`
      );
      return void 0;
    }
    if ((0, import_fs6.existsSync)(fullPath)) {
      cdsExtractorLog("info", `Using CodeQL config file from CODEQL_CONFIG_PATH: ${fullPath}`);
      return fullPath;
    }
    cdsExtractorLog(
      "warn",
      `CODEQL_CONFIG_PATH is set to '${envConfigPath}', but no file exists at '${fullPath}'.`
    );
    return void 0;
  }
  for (const configPath of DEFAULT_CONFIG_RELATIVE_PATHS) {
    const fullPath = (0, import_path11.join)(sourceRoot2, configPath);
    if ((0, import_fs6.existsSync)(fullPath)) {
      return fullPath;
    }
  }
  return void 0;
}
function getPathsIgnorePatterns(sourceRoot2) {
  const cached = patternsCache.get(sourceRoot2);
  if (cached !== void 0) {
    return cached;
  }
  const configPath = findCodeqlConfigFile(sourceRoot2);
  if (!configPath) {
    patternsCache.set(sourceRoot2, []);
    return [];
  }
  try {
    const content = (0, import_fs6.readFileSync)(configPath, "utf8");
    const config = load(content);
    if (!config || !Array.isArray(config["paths-ignore"])) {
      patternsCache.set(sourceRoot2, []);
      return [];
    }
    const patterns = config["paths-ignore"].filter(
      (p) => typeof p === "string" && p.length > 0
    );
    if (patterns.length > 0) {
      cdsExtractorLog(
        "info",
        `Found ${patterns.length} paths-ignore pattern(s) in ${configPath}: ${patterns.join(", ")}`
      );
    }
    patternsCache.set(sourceRoot2, patterns);
    return patterns;
  } catch (error) {
    cdsExtractorLog("warn", `Failed to read CodeQL config file at ${configPath}: ${String(error)}`);
    patternsCache.set(sourceRoot2, []);
    return [];
  }
}
function shouldIgnorePath(relativePath, patterns) {
  const matchOptions = { dot: true, windowsPathsNoEscape: true };
  for (const raw of patterns) {
    const pattern = raw.replace(/\/+$/, "");
    if (minimatch(relativePath, pattern, matchOptions)) {
      return true;
    }
    if (minimatch(relativePath, `${pattern}/**`, matchOptions)) {
      return true;
    }
  }
  return false;
}
function filterIgnoredPaths(relativePaths, patterns) {
  if (patterns.length === 0) {
    return relativePaths;
  }
  return relativePaths.filter((p) => !shouldIgnorePath(p, patterns));
}

// src/cds/parser/functions.ts
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
    const cdsFiles = Ui((0, import_path12.join)(projectDir, "**/*.cds"), {
      nodir: true,
      ignore: ["**/node_modules/**", "**/*.testproj/**"],
      windowsPathsNoEscape: true
    });
    const relativePaths = cdsFiles.map((file) => (0, import_path12.relative)(sourceRootDir, file));
    const pathsIgnorePatterns = getPathsIgnorePatterns(sourceRootDir);
    if (pathsIgnorePatterns.length > 0) {
      const filtered = filterIgnoredPaths(relativePaths, pathsIgnorePatterns);
      const ignoredCount = relativePaths.length - filtered.length;
      if (ignoredCount > 0) {
        cdsExtractorLog(
          "info",
          `Filtered ${ignoredCount} CDS file(s) matching paths-ignore patterns in project ${(0, import_path12.relative)(sourceRootDir, projectDir) || "."}`
        );
      }
      return filtered;
    }
    return relativePaths;
  } catch (error) {
    cdsExtractorLog("error", `Error finding CDS files in ${projectDir}: ${String(error)}`);
    return [];
  }
}
function determineCdsProjectsUnderSourceDir(sourceRootDir) {
  if (!sourceRootDir || !(0, import_fs7.existsSync)(sourceRootDir)) {
    throw new Error(`Source root directory '${sourceRootDir}' does not exist.`);
  }
  const foundProjects = /* @__PURE__ */ new Set();
  const packageJsonFiles = Ui((0, import_path12.join)(sourceRootDir, "**/package.json"), {
    nodir: true,
    ignore: ["**/node_modules/**", "**/*.testproj/**"],
    windowsPathsNoEscape: true
  });
  const cdsFiles = Ui((0, import_path12.join)(sourceRootDir, "**/*.cds"), {
    nodir: true,
    ignore: ["**/node_modules/**", "**/*.testproj/**"],
    windowsPathsNoEscape: true
  });
  const candidateDirectories = /* @__PURE__ */ new Set();
  for (const packageJsonFile of packageJsonFiles) {
    candidateDirectories.add((0, import_path12.dirname)(packageJsonFile));
  }
  for (const cdsFile of cdsFiles) {
    const cdsDir = (0, import_path12.dirname)(cdsFile);
    const projectRoot = findProjectRootFromCdsFile(cdsDir, sourceRootDir);
    if (projectRoot) {
      candidateDirectories.add(projectRoot);
    } else {
      candidateDirectories.add(cdsDir);
    }
  }
  for (const dir of candidateDirectories) {
    if (isLikelyCdsProject(dir)) {
      const relativePath = (0, import_path12.relative)(sourceRootDir, dir);
      const projectDir = relativePath || ".";
      let shouldAdd = true;
      const existingProjects = Array.from(foundProjects);
      for (const existingProject of existingProjects) {
        const existingAbsPath = (0, import_path12.join)(sourceRootDir, existingProject);
        if (dir.startsWith(existingAbsPath + import_path12.sep)) {
          const parentPackageJsonPath = (0, import_path12.join)(existingAbsPath, "package.json");
          const parentPackageJson = readPackageJsonFile(parentPackageJsonPath);
          const isParentMonorepo = parentPackageJson?.workspaces && Array.isArray(parentPackageJson.workspaces) && parentPackageJson.workspaces.length > 0;
          if (isParentMonorepo && (hasStandardCdsContent(existingAbsPath) || hasDirectCdsContent(existingAbsPath))) {
            shouldAdd = true;
          } else {
            shouldAdd = false;
          }
          break;
        }
        if (existingAbsPath.startsWith(dir + import_path12.sep)) {
          const currentPackageJsonPath = (0, import_path12.join)(dir, "package.json");
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
  if (!(0, import_fs7.existsSync)(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const content = (0, import_fs7.readFileSync)(filePath, "utf8");
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
      const currentDirName = (0, import_path12.basename)(currentDir);
      const isStandardSubdir = ["srv", "db", "app"].includes(currentDirName);
      if (isStandardSubdir) {
        const parentDir3 = (0, import_path12.dirname)(currentDir);
        if (parentDir3 !== currentDir && parentDir3.startsWith(sourceRootDir) && !parentDir3.includes("node_modules") && !parentDir3.includes(".testproj") && isLikelyCdsProject(parentDir3)) {
          return parentDir3;
        }
      }
      const parentDir2 = (0, import_path12.dirname)(currentDir);
      if (parentDir2 !== currentDir && parentDir2.startsWith(sourceRootDir) && !parentDir2.includes("node_modules") && !parentDir2.includes(".testproj")) {
        const hasDbDir2 = (0, import_fs7.existsSync)((0, import_path12.join)(parentDir2, "db")) && (0, import_fs7.statSync)((0, import_path12.join)(parentDir2, "db")).isDirectory();
        const hasSrvDir2 = (0, import_fs7.existsSync)((0, import_path12.join)(parentDir2, "srv")) && (0, import_fs7.statSync)((0, import_path12.join)(parentDir2, "srv")).isDirectory();
        const hasAppDir2 = (0, import_fs7.existsSync)((0, import_path12.join)(parentDir2, "app")) && (0, import_fs7.statSync)((0, import_path12.join)(parentDir2, "app")).isDirectory();
        if (hasDbDir2 && hasSrvDir2 || hasSrvDir2 && hasAppDir2) {
          return parentDir2;
        }
      }
      return currentDir;
    }
    const hasDbDir = (0, import_fs7.existsSync)((0, import_path12.join)(currentDir, "db")) && (0, import_fs7.statSync)((0, import_path12.join)(currentDir, "db")).isDirectory();
    const hasSrvDir = (0, import_fs7.existsSync)((0, import_path12.join)(currentDir, "srv")) && (0, import_fs7.statSync)((0, import_path12.join)(currentDir, "srv")).isDirectory();
    const hasAppDir = (0, import_fs7.existsSync)((0, import_path12.join)(currentDir, "app")) && (0, import_fs7.statSync)((0, import_path12.join)(currentDir, "app")).isDirectory();
    if (hasDbDir && hasSrvDir || hasSrvDir && hasAppDir) {
      return currentDir;
    }
    const parentDir = (0, import_path12.dirname)(currentDir);
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
      const packageJsonPath = (0, import_path12.join)(dir, "package.json");
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
  const standardLocations = [(0, import_path12.join)(dir, "db"), (0, import_path12.join)(dir, "srv"), (0, import_path12.join)(dir, "app")];
  for (const location of standardLocations) {
    if ((0, import_fs7.existsSync)(location) && (0, import_fs7.statSync)(location).isDirectory()) {
      const cdsFiles = Ui((0, import_path12.join)(location, "**/*.cds"), {
        nodir: true,
        windowsPathsNoEscape: true
      });
      if (cdsFiles.length > 0) {
        return true;
      }
    }
  }
  return false;
}
function hasDirectCdsContent(dir) {
  const directCdsFiles = Ui((0, import_path12.join)(dir, "*.cds"), { windowsPathsNoEscape: true });
  return directCdsFiles.length > 0;
}
function readPackageJsonFile(filePath) {
  if (!(0, import_fs7.existsSync)(filePath)) {
    return void 0;
  }
  try {
    const content = (0, import_fs7.readFileSync)(filePath, "utf8");
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
      expectedOutputFile: (0, import_path12.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const absoluteProjectDir = (0, import_path12.join)(sourceRootDir, project.projectDir);
  const capDirectories = ["db", "srv", "app"];
  const existingCapDirs = capDirectories.filter((dir) => (0, import_fs7.existsSync)((0, import_path12.join)(absoluteProjectDir, dir)));
  if (existingCapDirs.length > 0) {
    return {
      compilationTargets: existingCapDirs,
      expectedOutputFile: (0, import_path12.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const rootCdsFiles = project.cdsFiles.filter((file) => (0, import_path12.dirname)((0, import_path12.join)(sourceRootDir, file)) === absoluteProjectDir).map((file) => (0, import_path12.basename)(file));
  if (rootCdsFiles.length > 0) {
    return {
      compilationTargets: rootCdsFiles,
      expectedOutputFile: (0, import_path12.join)(project.projectDir, modelCdsJsonFile)
    };
  }
  const compilationTargets = project.cdsFiles.map(
    (file) => (0, import_path12.relative)(absoluteProjectDir, (0, import_path12.join)(sourceRootDir, file))
  );
  return {
    compilationTargets,
    expectedOutputFile: (0, import_path12.join)(project.projectDir, modelCdsJsonFile)
  };
}
function hasPackageJsonWithCapDeps(dir) {
  try {
    const packageJsonPath = (0, import_path12.join)(dir, "package.json");
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
  const pathsIgnorePatterns = getPathsIgnorePatterns(sourceRootDir);
  const projectMap = /* @__PURE__ */ new Map();
  for (const projectDir of projectDirs) {
    if (pathsIgnorePatterns.length > 0 && shouldIgnorePath(projectDir, pathsIgnorePatterns)) {
      cdsExtractorLog("info", `Skipping project '${projectDir}' \u2014 matches paths-ignore pattern`);
      continue;
    }
    const absoluteProjectDir = (0, import_path13.join)(sourceRootDir, projectDir);
    const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);
    if (cdsFiles.length === 0) {
      cdsExtractorLog(
        "info",
        `Skipping project '${projectDir}' \u2014 no CDS files remain after paths-ignore filtering`
      );
      continue;
    }
    const packageJsonPath = (0, import_path13.join)(absoluteProjectDir, "package.json");
    const packageJson = readPackageJsonFile(packageJsonPath);
    projectMap.set(projectDir, {
      projectDir,
      cdsFiles,
      compilationTargets: [],
      // Will be populated in the third pass
      expectedOutputFile: (0, import_path13.join)(projectDir, modelCdsJsonFile),
      packageJson,
      dependencies: [],
      imports: /* @__PURE__ */ new Map()
    });
  }
  cdsExtractorLog("info", "Analyzing dependencies between CDS projects...");
  for (const [projectDir, project] of projectMap.entries()) {
    for (const relativeFilePath of project.cdsFiles) {
      const absoluteFilePath = (0, import_path13.join)(sourceRootDir, relativeFilePath);
      try {
        const imports = extractCdsImports(absoluteFilePath);
        const enrichedImports = [];
        for (const importInfo of imports) {
          const enrichedImport = { ...importInfo };
          if (importInfo.isRelative) {
            const importedFilePath = (0, import_path13.resolve)((0, import_path13.dirname)(absoluteFilePath), importInfo.path);
            const normalizedImportedPath = importedFilePath.endsWith(".cds") ? importedFilePath : `${importedFilePath}.cds`;
            try {
              const relativeToDirPath = (0, import_path13.dirname)(relativeFilePath);
              const resolvedPath = (0, import_path13.resolve)((0, import_path13.join)(sourceRootDir, relativeToDirPath), importInfo.path);
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
              const otherProjectAbsoluteDir = (0, import_path13.join)(sourceRootDir, otherProjectDir);
              const isInOtherProject = otherProject.cdsFiles.some((otherFile) => {
                const otherAbsolutePath = (0, import_path13.join)(sourceRootDir, otherFile);
                return otherAbsolutePath === normalizedImportedPath || normalizedImportedPath.startsWith(otherProjectAbsoluteDir + import_path13.sep);
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
      project.compilationTargets = project.cdsFiles.map((file) => (0, import_path13.basename)(file));
      project.expectedOutputFile = (0, import_path13.join)(project.projectDir, modelCdsJsonFile);
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
var import_child_process10 = require("child_process");

// src/environment.ts
var import_child_process9 = require("child_process");
var import_fs8 = require("fs");
var import_os = require("os");
var import_path14 = require("path");
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
    const codeqlPathFromDist = (0, import_path14.resolve)((0, import_path14.join)(codeqlDist, codeqlExeName));
    if ((0, import_fs8.existsSync)(codeqlPathFromDist)) {
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
    const versionOutput = (0, import_child_process9.execFileSync)(codeqlExeName, ["version", "--format=json"], {
      encoding: "utf8",
      timeout: 5e3,
      // 5 seconds timeout
      stdio: "pipe"
      // Suppress output to console
    });
    try {
      const versionInfo = JSON.parse(versionOutput);
      if (versionInfo && typeof versionInfo.unpackedLocation === "string" && versionInfo.unpackedLocation) {
        const resolvedPathFromVersion = (0, import_path14.resolve)((0, import_path14.join)(versionInfo.unpackedLocation, codeqlExeName));
        if ((0, import_fs8.existsSync)(resolvedPathFromVersion)) {
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
    jsExtractorRoot = (0, import_child_process9.execFileSync)(
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
  return (0, import_path14.resolve)((0, import_path14.join)(jsExtractorRoot, "tools", autobuildScriptName));
}
function configureLgtmIndexFilters() {
  let excludeFilters = "";
  if (process.env.LGTM_INDEX_FILTERS) {
    cdsExtractorLog(
      "info",
      `Found $LGTM_INDEX_FILTERS already set to:
${process.env.LGTM_INDEX_FILTERS}`
    );
    const allowedExcludePatterns = [(0, import_path14.join)("exclude:**", "*"), (0, import_path14.join)("exclude:**", "*.*")];
    excludeFilters = "\n" + process.env.LGTM_INDEX_FILTERS.split("\n").filter(
      (line) => line.startsWith("exclude") && !allowedExcludePatterns.some((pattern) => line.includes(pattern))
    ).join("\n");
  }
  const lgtmIndexFiltersPatterns = [
    (0, import_path14.join)("exclude:**", "*.*"),
    (0, import_path14.join)("include:**", "*.cds.json"),
    (0, import_path14.join)("include:**", "*.cds"),
    (0, import_path14.join)("include:**", cdsExtractorMarkerFileName),
    (0, import_path14.join)("exclude:**", "node_modules", "**", "*.*")
  ].join("\n");
  process.env.LGTM_INDEX_FILTERS = lgtmIndexFiltersPatterns + excludeFilters;
  process.env.LGTM_INDEX_TYPESCRIPT = "NONE";
  process.env.LGTM_INDEX_FILETYPES = ".cds:JSON";
}
function applyPathsIgnoreToLgtmFilters(sourceRoot2) {
  const patterns = getPathsIgnorePatterns(sourceRoot2);
  if (patterns.length === 0) {
    return;
  }
  const excludeLines = patterns.map((p) => `exclude:${p}`).join("\n");
  const current = process.env.LGTM_INDEX_FILTERS ?? "";
  process.env.LGTM_INDEX_FILTERS = current + "\n" + excludeLines;
  cdsExtractorLog(
    "info",
    `Applied ${patterns.length} paths-ignore pattern(s) to LGTM_INDEX_FILTERS`
  );
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
  const result = (0, import_child_process10.spawnSync)(autobuildScriptPath2, {
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
  applyPathsIgnoreToLgtmFilters(sourceRoot2);
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
var import_path15 = require("path");
var USAGE_MESSAGE = `	Usage: node <script> <source-root>`;
function resolveSourceRoot(sourceRoot2) {
  if (!sourceRoot2 || typeof sourceRoot2 !== "string") {
    throw new Error("Source root must be a non-empty string");
  }
  const normalizedPath = (0, import_path15.resolve)(sourceRoot2);
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
          ...Ui((0, import_path16.join)(sourceRoot, "**/*.cds"), {
            ignore: ["**/node_modules/**", "**/.git/**"],
            windowsPathsNoEscape: true
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
logPerformanceTrackingStart("CDS Indexer");
var cdsIndexerSummary = orchestrateCdsIndexer(
  dependencyGraph,
  sourceRoot,
  projectCacheDirMap,
  codeqlExePath
);
logPerformanceTrackingStop("CDS Indexer");
if (cdsIndexerSummary.projectsRequiringIndexer > 0) {
  logPerformanceMilestone(
    "CDS indexer completed",
    `${cdsIndexerSummary.successfulRuns} succeeded, ${cdsIndexerSummary.failedRuns} failed`
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
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=cds-extractor.bundle.js.map
