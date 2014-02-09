(function(g,j){var a=document.createElement("input");var w={setSelectionRange:("setSelectionRange" in a)||("selectionStart" in a),createTextRange:("createTextRange" in a)||("selection" in document)};var x=/\r\n/g,d=/\r/g;var l=function(D){if(typeof(D.value)!=="undefined"){return D.value}return g(D).text()};var k=function(D,E){if(typeof(D.value)!=="undefined"){D.value=E}else{g(D).text(E)}};var A=function(E,G){var F=l(E).replace(d,"");var D=F.length;if(typeof(G)==="undefined"){G=D}G=Math.floor(G);if(G<0){G=D+G}if(G<0){G=0}if(G>D){G=D}return G};var z=function(D,E){return D.hasAttribute?D.hasAttribute(E):(typeof(D[E])!=="undefined")};var s=function(G,D,E,F){this.start=G||0;this.end=D||0;this.length=E||0;this.text=F||""};s.prototype.toString=function(){return JSON.stringify(this,null,"    ")};var o=function(D){return D.selectionStart};var n=function(G){var J,F,E,I,D,H;G.focus();G.focus();F=document.selection.createRange();if(F&&F.parentElement()===G){I=l(G);D=I.length;E=G.createTextRange();E.moveToBookmark(F.getBookmark());H=G.createTextRange();H.collapse(false);if(E.compareEndPoints("StartToEnd",H)>-1){J=I.replace(x,"\n").length}else{J=-E.moveStart("character",-D)}return J}return 0};var f=function(D){if(!D){return j}if(w.setSelectionRange){return o(D)}else{if(w.createTextRange){return n(D)}}return j};var C=function(D,E){D.setSelectionRange(E,E)};var u=function(E,F){var D=E.createTextRange();D.move("character",F);D.select()};var e=function(D,E){D.focus();E=A(D,E);if(w.setSelectionRange){C(D,E)}else{if(w.createTextRange){u(D,E)}}};var b=function(E,I){var G=f(E);var F=l(E).replace(d,"");var H=+(G+I.length+(F.length-G));var D=+E.getAttribute("maxlength");if(z(E,"maxlength")&&H>D){var J=I.length-(H-D);I=I.substr(0,J)}k(E,F.substr(0,G)+I+F.substr(G));e(E,G+I.length)};var h=function(F){var E=new s();E.start=F.selectionStart;E.end=F.selectionEnd;var G=Math.min(E.start,E.end);var D=Math.max(E.start,E.end);E.length=D-G;E.text=l(F).substring(G,D);return E};var c=function(K){var H=new s();K.focus();var L=document.selection.createRange();if(L&&L.parentElement()===K){var I,J,M,G,D=0,F=0;var E=l(K);I=E.length;J=E.replace(/\r\n/g,"\n");M=K.createTextRange();M.moveToBookmark(L.getBookmark());G=K.createTextRange();G.collapse(false);if(M.compareEndPoints("StartToEnd",G)>-1){D=F=I}else{D=-M.moveStart("character",-I);D+=J.slice(0,D).split("\n").length-1;if(M.compareEndPoints("EndToEnd",G)>-1){F=I}else{F=-M.moveEnd("character",-I);F+=J.slice(0,F).split("\n").length-1}}D-=(E.substring(0,D).split("\r\n").length-1);F-=(E.substring(0,F).split("\r\n").length-1);H.start=D;H.end=F;H.length=H.end-H.start;H.text=J.substr(H.start,H.length)}return H};var q=function(D){if(!D){return j}if(w.setSelectionRange){return h(D)}else{if(w.createTextRange){return c(D)}}return j};var B=function(D,F,E){D.setSelectionRange(F,E)};var t=function(E,G,F){var H;var J=E.createTextRange();var I=l(E);var D=G;for(H=0;H<D;H++){if(I.substr(H,1).search(x)!==-1){G=G-1}}D=F;for(H=0;H<D;H++){if(I.substr(H,1).search(x)!==-1){F=F-1}}J.moveEnd("textedit",-1);J.moveStart("character",G);J.moveEnd("character",F-G);J.select()};var v=function(D,F,E){F=A(D,F);E=A(D,E);if(w.setSelectionRange){B(D,F,E)}else{if(w.createTextRange){t(D,F,E)}}};var p=function(K,O){var J=g(K);var D=J.val();var M=q(K);var H=+(M.start+O.length+(D.length-M.end));var F=+J.attr("maxlength");if(J.is("[maxlength]")&&H>F){var N=O.length-(H-F);O=O.substr(0,N)}var L=D.substr(0,M.start);var G=D.substr(M.end);J.val(L+O+G);var I=M.start;var E=I+O.length;v(K,M.length?I:E,E)};var y=function(F){var E=window.getSelection();var D=document.createRange();D.selectNodeContents(F);E.removeAllRanges();E.addRange(D)};var r=function(E){var D=document.body.createTextRange();D.moveToElementText(E);D.select()};var i=function(E){var D=g(E);if(D.is("input, textarea")||E.select){D.select();return}if(w.setSelectionRange){y(E)}else{if(w.createTextRange){r(E)}}};var m=function(){if(document.selection){document.selection.empty()}else{if(window.getSelection){window.getSelection().removeAllRanges()}}};g.extend(g.fn,{caret:function(){var E=this.filter("input, textarea");if(arguments.length===0){var D=E.get(0);return f(D)}else{if(typeof arguments[0]==="number"){var G=arguments[0];E.each(function(I,H){e(H,G)})}else{var F=arguments[0];E.each(function(I,H){b(H,F)})}}return this},range:function(){var G=this.filter("input, textarea");if(arguments.length===0){var D=G.get(0);return q(D)}else{if(typeof arguments[0]==="number"){var F=arguments[0];var E=arguments[1];G.each(function(J,I){v(I,F,E)})}else{var H=arguments[0];G.each(function(J,I){p(I,H)})}}return this},selectAll:function(){return this.each(function(E,D){i(D)})}});g.extend(g,{deselectAll:function(){m();return this}})}(window.jQuery||window.Zepto||window.$));