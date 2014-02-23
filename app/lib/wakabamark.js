function arr_iterate(array, callback) {
	var i=0, len = array.length;
	for ( ; i < len ; i++ ){
		callback(array[i]);
	}
}

var WM = function() {
	this.tags = [];
	this.bypasstags = [];
	this.lists = [];
	
	this.options = {
    escapeHtml: false,
		makeLinks: true,
		bypass: true,
		greenquoting: true,
		makeEmbeds: true,
		makeLists: true,
		makeAnonchatLinks: true,
	}
	
	this.clinks = {
		exp: /(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&amp;]*)?)?(#[a-zA-Z0-9!$&'()*+.=-_~:@/?]*)?)(?=\s+|<|$)/gi,
		rep: "<a target=\"_blank\" href=\"$1\">$1</a>"
	}
	
	this.escapechars = [
		[/\'/g, '&#039;'],
		[/\"/g, '&quot;'],
		[/</g, '&lt;'], 
		[/\>/g, '&gt;'],
	];
	
	this.escRX = function(exp) {
		return exp.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
	
	var picl = [];
	
	this.escHTML = function(string) {
		for (var i = this.escapechars.length - 1; i >= 0; i--) {
			string = string.replace(this.escapechars[i][0], this.escapechars[i][1]);
		}
		return string;
	}

	this.newTag = function(pattern, replace) {
		for (var i = 0; i <= 1; i++) {
			pattern[i] = this.escRX(this.escHTML(pattern[i]));
		}
		var exp = new RegExp(pattern[0]+'([\\s\\S]+?)'+pattern[1], "mg");
		return {exp: exp, rep: replace[0]+"$1"+replace[1]};
	};
	
	this.apply = function(str, room) {
		var tag = {};

    if( this.options.escapeHtml ) {
      //html escape
      str = this.escHTML(str);
    }
		
		//Bypass 
		if(this.options.bypass) {
			for (var i = this.bypasstags.length - 1; i >= 0; i--) {
				tag = this.bypasstags[i];
				str = str.replace(tag.exp, function(match, p1, offset, s) {
					var tagescapechars = [
						[/\*/mg, '&#42;'], [/\#/mg, '&#35;'],
						[/_/mg, '&#95;'],
						[/\[/mg, '&#91;'], [/\]/mg, '&#93;'],
						[/%/mg, '&#37;'],
						[/\&gt;/g, '&#62;'],
					];
					for (var j = tagescapechars.length - 1; j >= 0; j--) {
						p1 = p1.replace(tagescapechars[j][0], tagescapechars[j][1]);
					}
					return tag.rep.split('$1')[0]+p1+tag.rep.split('$1')[1];
				});
			}
		}
		
		//>implying
		if(this.options.greenquoting) {
			var result = "";
			str = str.replace(
				/(?:\&gt;)([^\r\n]+)/mg, 
				'<q>\&gt;$1</q>'
			);
		}

		//lists
		if(this.options.makeLists) {
			for (i = this.lists.length - 1; i >= 0; i--) {
				tag = this.lists[i];
				var xp = new RegExp('((?:(?:(?:^'+tag.exp+')(?:[^\\r\\n]+))(?:\\r|\\n?))+)', "mg");
				var ixp = new RegExp('(?:'+tag.exp+')([^\\r\\n]+)', "mg");
				str = str.replace(xp, function(match, p1, offset, s) {
					var p = p1;
					var list = p.split('\n'), result=tag.rep[0];
					arr_iterate(list, function(elem) {
						result += elem.replace(ixp, "<li>$1</li>");
					});
					result += tag.rep[1];
					return(result);
				});
			}
		}
		
		str = '<p>'+str.trim().split(/\s*[\n\r]+\s*/mg).join('</p><p>')+'</p>';

		
		if(this.options.reduceNewlines) {
			str = str.replace(/(<br \/>){2,}/mg,"<br /><br />");
		}
		
		//apply formatting
		for (i = this.tags.length - 1; i >= 0; i--) {
			tag = this.tags[i];
			str = str.replace(tag.exp, tag.rep);
		}
		
		//rghost
		if(this.options.makeEmbeds) {
			str = str.replace(/(?:\[\:)([0-9]+)(?:\:\])/mg, 
		'<a class="rgh-link" data-nextpic="http://rghost.ru/$1/image.png" href="http://rghost.ru/$1.view"><img src="http://rghost.ru/$1/thumb.png"></img></a>');
		}

		//make links clickable
		if(this.options.makeLinks) {
			str = str.replace(this.clinks.exp, this.clinks.rep);
		}

    var linkTmpl_type1 = '<a href="$1" data-bind="click: appGoTo.bind($data, \'$1\')">$2</a>';
    var linkTmpl_type2 = '<a href="$1" data-bind="click: appGoTo.bind($data, \'$1\')">$1</a>';
    var linkTmpl_type3 = '<a href="/'+room+'$1" data-bind="click: appGoTo.bind($data, \'/'+room+'$1\')">$1</a>';

		if(this.options.makeAnonchatLinks) {
      str = str.replace(/(?:\s|>|&gt;|^)(\/\w*[A-Za-z_]\w*\/\d+\/)(?:\s|<|$)/g, function(match, link) {
        var parts = match.split('/')
        var res = parts[1] == room
          ? '<!-- anonchatLink(1,'+link+',/'+parts[2]+'/) -->'
          : '<!-- anonchatLink(1,'+link+','+link+') -->';
        return parts[0]+res+parts[3];
      });

      str = str.replace(/(?:\s|>|&gt;|^)(\/\w*[A-Za-z_]\w*\/)(?:\s|<|$)/g, function(match, link) {
        var parts = match.split('/')
        return parts[0]+'<!-- anonchatLink(2,'+link+') -->'+parts[2];
      });

      str = str.replace(/(?:\s|>|&gt;|^)(\/\d+\/)(?:\s|<|$)/g, function(match, link) {
        var parts = match.split('/')
        return parts[0]+'<!-- anonchatLink(3,'+link+') -->'+parts[2];
      });

      str = str.replace(/<!-- anonchatLink\(1,(.+?),(.+?)\) -->/ig    , linkTmpl_type1)
      str = str.replace(/<!-- anonchatLink\(2,(.+?)\) -->/ig          , linkTmpl_type2)
      str = str.replace(/<!-- anonchatLink\(3,(.+?)\) -->/ig          , linkTmpl_type3);

		}

		return str;
	};
	
	this.registerTags = function(tags, destination) {
		tag = [];   var result, i;
		if(destination === 'lists') {
			for (i = tags.length - 1; i >= 0; i--) {
				tag = tags[i];
				result = this.escRX(this.escHTML(tag[0]));
				this.lists.push({exp: result, rep: tag[1]});
			}
		}
		else for (i = tags.length - 1; i >= 0; i--) {
			tag = tags[i];
			result = this.newTag(tag[0], tag[1]);
			if(destination === 'bypass') {
				this.bypasstags.push(result);
			}
			else this.tags.push(result);
		}
	};
};

var wm_tags = [
	[['**','**'],		['<b>','</b>']],
//	[['__','__'],		['<b>','</b>']],
	[['*','*'],			['<i>','</i>']],
//	[['_','_'],			['<i>','</i>']],
];

var bypass_tags = [
//	[['[code]','[/code]'],	['<pre class="code">','</pre>']],
	[['`','`'],				['<pre class="code">','</pre>']]
];

/*
var ku_tags = [
	[['[b]','[/b]'],	['<b>','</b>']],
	[['[i]','[/i]'],	['<i>','</i>']],
	[['[u]','[/u]'],	['<span style="text-decoration: underline">','</span>']],
	[['[s]','[/s]'],	['<strike>','</strike>']],
	[['%%','%%'],		['<span class="spoiler">','</span>']],
	[['[spoiler]','[/spoiler]'],		['<span class="spoiler">','</span>']],
	[['[aa]','[/aa]'],	['<span style="font-family: Mona,\'MS PGothic\' !important;">','</span>']]
];

var lists = [
	["* ", ["<ul>","</ul>"]],
	["# ", ["<ol>","</ol>"]]
];
*/

var wm = new WM();

wm.registerTags(wm_tags);
//wm.registerTags(ku_tags);
wm.registerTags(bypass_tags, 'bypass');
//wm.registerTags(lists, 'lists');

module.exports = wm.apply.bind(wm);
