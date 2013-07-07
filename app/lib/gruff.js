/*jshint laxcomma:true*/
/*globals module require*/

(function(){
  "use strict";

  var fn = {}
    , render_order = "";

  function f (str) {
    ([].slice.call(arguments, 1))
      .forEach(function (n, i) {
        str = str.split("$" + i).join(n || "");
      });

    return str;
  }

  function _l (str) {

    return str.slice(-1) === "#" ? "ol" : "ul";
  }

  // block elements need to be inlined for processing since gruff processes based on lines
  // while processing blocks are inlined and returned to multiline before final return statement
  function nlInliner (str, tokenize) {
    var
      NLs = "\n"
    , NLt = "~!salt-NL-salt!~"
    , rNL = new RegExp(NLs, "g")
    , rNT = new RegExp(NLt, "g");

    return tokenize
      // tokenize newlines for blocks with breaks
      ? str.replace(rNL, NLt)
      // de-tokenize newlines for readability
      : str.replace(rNT, NLs);
  }

  // functions used by replace due to necessary logic in rendering
  function fnCODE_PRE (CODE, PRE) {
    return function (match, $1, $2, $3) {
      match = $2
        ? f(gruff.templates[CODE], $3, $2)
        : f(gruff.templates[PRE], $3);

      return nlInliner(match, true);
    };
  }

  function fnDL (DL, DT, DD) {
    return function (match) {
      match = match
        .replace(/^\?\s+(.+)/gm, gruff.templates[DT])
        .replace(/^\+\s+(.+)/gm, gruff.templates[DD]);

      return f(gruff.templates[DL], match);
    };
  }

  function fnH (H) {
    return function (match, $1, $2) {
      return f(gruff.templates[H], $1.length, $2);
    };
  }

  function fnLI () {
    return function (list, leader) {
      var stack = [];

      list = list
        .split("\n")
        .reduce(function (acc, node) {
          if (node) {
            node = node.match(/^([\*#]+)\s+(.*)/);
            node = { bullet: node[1], item: node[2] };

            if (stack[0] !== node.bullet) {
              if (stack[0] && stack[0].length > node.bullet.length) {
                while (stack[0] !== node.bullet) {
                  acc += f("</li>\n</$0>\n", _l(stack.shift()));
                }
                acc += "</li>\n";
              } else {
                stack.unshift(node.bullet);
                acc += (stack.length > 1 ? "\n" : "") + f("<$0>\n", _l(node.bullet));
              }
            } else {
              acc += "</li>\n";
            }

            return acc + "<li>" + node.item;
          } else {
            return acc;
          }
        }, "");

      while (stack.length) {
        list += f("</li>\n</$0>\n", _l(stack.shift()));
      }

      return list;
    };
  }

  function fnLINK (FIGURE, IMG, LINK) {
    return function (match, $1, $2, $3, $4, $5) {
      // $1 label
      // $2 uri
      // $3 alt text
      // $4 caption
      // $5 CSS class(es)
      $1 = /image/i.test($1);
      $4 = $4 || "";
      $5 = $5 || "";

      return $4 === "" && $5 === ""
        ? f(($1 ? gruff.templates[IMG] : gruff.templates[LINK]), $2, (!$1 && !$3 ? $2 : $3), ($1 ? "" : $4), "")
        : f(($1 ? gruff.templates[FIGURE] : gruff.templates[LINK]), $2, $3, $4, $5);
    };
  }

  function fnLINKRAW (LINKRAW) {
    return function (match, $1, $2, $3) {
      if ($1 === '"' && $2.slice(-1) === '"') {
        return match;
      } else {
        return gruff.templates[LINKRAW].replace("$1", $1 || "").replace(/\$2/g, $2);
      }
    };
  }

  function gruff (str) {
    str = render_order
      .reduce(function (acc, key) {
        var config = fn[key]
          , replacement;

        replacement = (config.func)
          ? config.func.apply(null, config.replacement)
          : gruff.templates[config.replacement];

        return acc.replace(config.pattern, replacement);
      }, str);

    return nlInliner(str, false);
  }

  gruff.render = function (name, pattern, replacement, func) {
    // TODO: error checking!
    if (arguments.length === 1) {
      return fn[name];
    }

    fn[name] = {
        func: func
      , pattern: pattern
      , replacement: replacement
    };

    return this;
  };

  gruff.set_render_order = function (ord) {
    // as it is written, paragraphs need to be the last of the block elements
    // to prevent wrapping block element child lines in paragraph tags
    ord = ord || "BLOCKQUOTE CODE P LINKRAW CODELET STRONG EM SUB SUP";
    //ord = ord || "BLOCKQUOTE CODE DL LI HR H LINK P LINKRAW ABBR CODELET STRONG EM SUB SUP";
    render_order = ord.split(" ");
  };

  gruff.templates = {
      BLOCKQUOTE : '<figure><blockquote><p>$1</p></blockquote><figcaption>$3</figcaption></figure>'
    , CODE       : '<pre><code class="$1">\n$0\n</code></pre>'
    , CODELET    : '<code>$1</code>'
    , EM         : ' <em>$1</em> '
    , LINKRAW    : '$1<a href="$2" title="">$2</a>'
    , P          : '<p>$1</p>'
    , PP         : '\n<p>$1</p>\n'
    , PRE        : '<pre>$0</pre>'
    , STRONG     : '<strong>$1</strong>'
    , SUB        : '<sub>$1</sub> '
    , SUP        : '<sup>$1</sup> '
    /*
      ABBR       : '<abbr title="$2">$1</abbr>'
    , FIGURE     : '<figure class="$3"><img alt="$1" src="$0" /><figcaption>$2</figcaption></figure>'
    , IMG        : '<img alt="$1" src="$0" />'
    , LINK       : '<a class="$3" href="$0" title="$2">$1</a>'
    , H          : '<h$0>$1</h$0>'
    , HR         : '<hr />'
    , DD         : '<dd>$1</dd>'
    , DL         : '<dl>\n$0</dl>\n'
    , DT         : '<dt>$1</dt>'

    */
  };

  gruff.set_render_order();

  gruff
    .render("BLOCKQUOTE", (/^\s{4}((['"]).*\1)\s~\s(.*)$/gm), "BLOCKQUOTE")
    .render("CODE",       (/^(```)(\w*)\n+([^\1]*?)\n+\1/gm), ["CODE", "PRE"], fnCODE_PRE)
    .render("CODELET",    (/`(.+?)`/g), "CODELET")
    .render("EM",         (/\s\/\/(?=[^\s])(.+?)(?=[^\s])\/\/\s/g), "EM") // lookaheads are to keep code comments
    .render("LI",         (/^(?:([#\*]+)\s+[^$\n]+\D)+/gm), [], fnLI)
    .render("LINKRAW",    (/(.)?(http[s]?:\/\/[^\s]+?)(?=[\s\n\b<])/g), ["LINKRAW"], fnLINKRAW)
    .render("P",          (/^([^<\n].+)$/gm), "P")
    .render("STRONG",     (/__(.+?)__/g), "STRONG")
    .render("SUB",        (/\\\\([^\s]+?)\s/g), "SUB")
    .render("SUP",        (/\^\^([^\s]+)\s/g), "SUP");

//    .render("ABBR",       (/\(\(([^\|]+)\|([^\)]+)\)\)/g), "ABBR")
//    .render("LINK",       (/\[\[((?:image|link):)?([^\]\]]+?)(?:\|([^\|\]]*?))?(?:\|([^\|\]]*?))?(?:\|([^\|\]]*?))?\]\]/g), ["FIGURE", "IMG", "LINK"], fnLINK)
//    .render("H",          (/^(=[=\+]*)\s+(.*)/gm), ["H"], fnH)
//    .render("HR",         (/^-{3,}.*/gm), "HR")
//    .render("DL",         (/^(?:[\?\+]+\s+[^$\n]+\D)+/gm), ["DL", "DT", "DD"], fnDL)

  typeof module === 'undefined'
    ? this.gruff = gruff
    : module.exports = gruff;

}.call(this));
