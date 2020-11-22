(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// client-side js, loaded by index.html
// run by the browser each time the page is loaded

console.log("hello world :o");
var keyword_extractor = require("keyword-extractor");

var wordsSeen = new Set()

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition

var recognition = new SpeechRecognition();

recognition.onresult = function(event) {
  var text = event.results[0][0].transcript;
  console.log('Confidence: ' + event.results[0][0].confidence);
  console.log(text);
  display(text)
  var keywords = getKeyWords(text)
  
  keywords.forEach(s=> {
     console.log(s)
     if(!wordsSeen.has(s)) {                 
       appendNewDream(s);
       wordsSeen.add(s);
    }
  }
  )
}


recognition.lang =  'en-US'; // zh for chinese
recognition.interimResults = false;
//recognition.start();

function onStart() {
  recognition.start();
}

function onStop() {
  recognition.stop();
}

const startButton = document.getElementById("START");
startButton.addEventListener("click", event=> onStart());

const stopButton = document.getElementById("STOP");
stopButton.addEventListener("click", event=> onStop());

const displayArea = document.getElementById("DISPLAY")

function display(sentence)
{
  displayArea.innerHTML = sentence
}

function getKeyWords(sentence) {
  var extraction_result = keyword_extractor.extract(sentence,{
                                                                  language:"english",
                                                                  remove_digits: true,
                                                                  return_changed_case:true,
                                                                  remove_duplicates: true

                                                               });
  return extraction_result;
  
}

// define variables that reference elements on our page
const dreamsList = document.getElementById("dreams");
const dreamsForm = document.querySelector("form");

// a helper function that creates a list item for a given dream
function appendNewDream(dream) {
  const newListItem = document.createElement("li");
  newListItem.innerText = dream;
  dreamsList.appendChild(newListItem);
}

display("Great")

// fetch the initial list of dreams
fetch("/dreams")
  .then(response => response.json()) // parse the JSON from the server
  .then(dreams => {
    // remove the loading text
    dreamsList.firstElementChild.remove();
  
    // iterate through every dream and add it to our page
    dreams.forEach(appendNewDream);
  
    // listen for the form to be submitted and add a new dream when it is
    dreamsForm.addEventListener("submit", event => {
      // stop our form submission from refreshing the page
      event.preventDefault();

      // get dream value and add it to the list
      let newDream = dreamsForm.elements.dream.value;
      dreams.push(newDream);
      appendNewDream(newDream);

      // reset form
      dreamsForm.reset();
      dreamsForm.elements.dream.focus();
    });
  });

},{"keyword-extractor":2}],2:[function(require,module,exports){
module.exports = require('./lib/keyword_extractor');
},{"./lib/keyword_extractor":3}],3:[function(require,module,exports){
var _ = require("underscore");
_.str = require('underscore.string');
var supported_languages = ["danish","dutch","english","french","galician","german","italian","polish","portuguese","romanian","russian","spanish","swedish"];
var stopwords = require("./stopwords/stopwords");

function _extract(str, options){
    if(_.isEmpty(str)){
        return [];
    }
    if(_.isEmpty(options)){
        options = {
            remove_digits: true,
            return_changed_case: true
        };
    }
    var return_changed_case = options.return_changed_case;
    var return_chained_words = options.return_chained_words;
    var remove_digits = options.remove_digits;
    var _language = options.language || "english";
    var _remove_duplicates = options.remove_duplicates || false;
    var return_max_ngrams = options.return_max_ngrams;

    if(supported_languages.indexOf(_language) < 0){
        throw new Error("Language must be one of ["+supported_languages.join(",")+"]");
    }

    //  strip any HTML and trim whitespace
    var text = _.str.trim(_.str.stripTags(str));
    if(_.isEmpty(text)){
        return [];
    }else{
        var words = text.split(/\s/);
        var unchanged_words = [];
        var low_words = [];
        //  change the case of all the words
        for(var x = 0;x < words.length; x++){
            var w = words[x].match(/https?:\/\/.*[\r\n]*/g) ? words[x] : words[x].replace(/\.|,|;|!|\?|\(|\)|:|"|^'|'$|“|”|‘|’/g,'');
            //  remove periods, question marks, exclamation points, commas, and semi-colons
            //  if this is a short result, make sure it's not a single character or something 'odd'
            if(w.length === 1){
                w = w.replace(/-|_|@|&|#/g,'');
            }
            //  if it's a number, remove it
            var digits_match = w.match(/\d/g);
            if(remove_digits && digits_match && digits_match.length === w.length){
                w = "";
            }
            if(w.length > 0){
                low_words.push(w.toLowerCase());
                unchanged_words.push(w);
            }
        }
        var results = [];
        var _stopwords = options.stopwords || _getStopwords({ language: _language });
        var _last_result_word_index = 0;
        var _start_result_word_index = 0;
	var _unbroken_word_chain = false;
        for(var y = 0; y < low_words.length; y++){

            if(_stopwords.indexOf(low_words[y]) < 0){
                
                if(_last_result_word_index !== y - 1){
                    _start_result_word_index = y;
                    _unbroken_word_chain = false; 
		} else {
	            _unbroken_word_chain = true;
		}
                var result_word = return_changed_case && !unchanged_words[y].match(/https?:\/\/.*[\r\n]*/g) ? low_words[y] : unchanged_words[y];
                
                if (return_max_ngrams && _unbroken_word_chain && !return_chained_words && return_max_ngrams > (y - _start_result_word_index) && _last_result_word_index === y - 1){
                    var change_pos = results.length - 1 < 0 ? 0 : results.length - 1;
                    results[change_pos] = results[change_pos] ? results[change_pos] + ' ' + result_word : result_word;
                } else if (return_chained_words && _last_result_word_index === y - 1) {
                  var change_pos = results.length - 1 < 0 ? 0 : results.length - 1;
                  results[change_pos] = results[change_pos] ? results[change_pos] + ' ' + result_word : result_word;
                } else {
                  results.push(result_word);
                }

                _last_result_word_index = y;
            } else {
		_unbroken_word_chain = false;
	    }
        }

        if(_remove_duplicates) {
            results= _.uniq(results, function (item) {
                return item;
            });
        }

        return results;
    }
}

function _getStopwords(options){
    options = options || {};

    var _language = options.language || "english";
    if(supported_languages.indexOf(_language) < 0){
        throw new Error("Language must be one of ["+supported_languages.join(",")+"]");
    }

    return stopwords[_language];
}

module.exports = {
    extract:_extract,
    getStopwords: _getStopwords
};

},{"./stopwords/stopwords":17,"underscore":89,"underscore.string":43}],4:[function(require,module,exports){
// Danish stopwords
// http://www.ranks.nl/stopwords/danish
// https://github.com/dnohr

module.exports = {
    stopwords: [
		"ad",
		"af",
		"aldrig",
		"alle",
		"alt",
		"altid",
		"anden",
		"andet",
		"andre",
		"at",
		"bagved",
		"begge",
		"blev",
		"blive",
		"bliver",
		"da",
		"de",
		"dem",
		"den",
		"denne",
		"der",
		"deres",
		"det",
		"dette",
		"dig",
		"din",
		"disse",
		"dog",
		"du",
		"efter",
		"ej",
		"eller",
		"en",
		"end",
		"endnu",
		"ene",
		"eneste",
		"enhver",
		"er",
		"et",
		"fem",
		"fire",
		"fjernt",
		"flere",
		"fleste",
		"for",
		"foran",
		"fordi",
		"forrige",
		"fra",
		"få",
		"før",
		"gennem",
		"god",
		"ham",
		"han",
		"hans",
		"har",
		"havde",
		"have",
		"hende",
		"hendes",
		"her",
		"hos",
		"hovfor",
		"hun",
		"hurtig",
		"hvad",
		"hvem",
		"hver",
		"hvilken",
		"hvis",
		"hvonår",
		"hvor",
		"hvordan",
		"hvorfor",
		"hvorhen",
		"hvornår",
		"i",
		"ikke",
		"imod",
		"ind",
		"ingen",
		"intet",
		"ja",
		"jeg",
		"jer",
		"jeres",
		"jo",
		"kan",
		"kom",
		"kommer",
		"kunne",
		"langsom",
		"lav",
		"lidt",
		"lille",
		"man",
		"mand",
		"mange",
		"med",
		"meget",
		"mellem",
		"men",
		"mens",
		"mere",
		"mig",
		"min",
		"mindre",
		"mine",
		"mit",
		"mod",
		"måske",
		"ned",
		"nede",
		"nej",
		"ni",
		"nogen",
		"noget",
		"nogle",
		"nok",
		"nu",
		"ny",
		"nyt",
		"når",
		"nær",
		"næste",
		"næsten",
		"og",
		"også",
		"om",
		"op",
		"oppe",
		"os",
		"otte",
		"over",
		"på",
		"rask",
		"sammen",
		"se",
		"seks",
		"selv",
		"ses",
		"sig",
		"sin",
		"sine",
		"sit",
		"skal",
		"skulle",
		"som",
		"stor",
		"store",
		"syv",
		"sådan",
		"temmelig",
		"thi",
		"ti",
		"til",
		"to",
		"tre",
		"ud",
		"uden",
		"udenfor",
		"under",
		"var",
		"ved",
		"vi",
		"vil",
		"ville",
		"vor",
		"være",
		"været"
    ]
};
},{}],5:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// German stopwords
// via https://code.google.com/p/stop-words/
module.exports = {
    stopwords: [
        "a",
        "ab",
        "aber",
        "ach",
        "acht",
        "achte",
        "achten",
        "achter",
        "achtes",
        "ag",
        "alle",
        "allein",
        "allem",
        "allen",
        "aller",
        "allerdings",
        "alles",
        "allgemeinen",
        "als",
        "also",
        "am",
        "an",
        "andere",
        "anderen",
        "andern",
        "anders",
        "au",
        "auch",
        "auf",
        "aus",
        "ausser",
        "außer",
        "ausserdem",
        "außerdem",
        "b",
        "bald",
        "bei",
        "beide",
        "beiden",
        "beim",
        "beispiel",
        "bekannt",
        "bereits",
        "besonders",
        "besser",
        "besten",
        "bin",
        "bis",
        "bisher",
        "bist",
        "c",
        "d",
        "da",
        "dabei",
        "dadurch",
        "dafür",
        "dagegen",
        "daher",
        "dahin",
        "dahinter",
        "damals",
        "damit",
        "danach",
        "daneben",
        "dank",
        "dann",
        "daran",
        "darauf",
        "daraus",
        "darf",
        "darfst",
        "darin",
        "darüber",
        "darum",
        "darunter",
        "das",
        "dasein",
        "daselbst",
        "dass",
        "daß",
        "dasselbe",
        "davon",
        "davor",
        "dazu",
        "dazwischen",
        "dein",
        "deine",
        "deinem",
        "deiner",
        "dem",
        "dementsprechend",
        "demgegenüber",
        "demgemäss",
        "demgemäß",
        "demselben",
        "demzufolge",
        "den",
        "denen",
        "denn",
        "denselben",
        "der",
        "deren",
        "derjenige",
        "derjenigen",
        "dermassen",
        "dermaßen",
        "derselbe",
        "derselben",
        "des",
        "deshalb",
        "desselben",
        "dessen",
        "deswegen",
        "d.h",
        "dich",
        "die",
        "diejenige",
        "diejenigen",
        "dies",
        "diese",
        "dieselbe",
        "dieselben",
        "diesem",
        "diesen",
        "dieser",
        "dieses",
        "dir",
        "doch",
        "dort",
        "drei",
        "drin",
        "dritte",
        "dritten",
        "dritter",
        "drittes",
        "du",
        "durch",
        "durchaus",
        "dürfen",
        "dürft",
        "durfte",
        "durften",
        "e",
        "eben",
        "ebenso",
        "ehrlich",
        "ei",
        "ei,",
        "eigen",
        "eigene",
        "eigenen",
        "eigener",
        "eigenes",
        "ein",
        "einander",
        "eine",
        "einem",
        "einen",
        "einer",
        "eines",
        "einige",
        "einigen",
        "einiger",
        "einiges",
        "einmal",
        "eins",
        "elf",
        "en",
        "ende",
        "endlich",
        "entweder",
        "er",
        "Ernst",
        "erst",
        "erste",
        "ersten",
        "erster",
        "erstes",
        "es",
        "etwa",
        "etwas",
        "euch",
        "f",
        "früher",
        "fünf",
        "fünfte",
        "fünften",
        "fünfter",
        "fünftes",
        "für",
        "g",
        "gab",
        "ganz",
        "ganze",
        "ganzen",
        "ganzer",
        "ganzes",
        "gar",
        "gedurft",
        "gegen",
        "gegenüber",
        "gehabt",
        "gehen",
        "geht",
        "gekannt",
        "gekonnt",
        "gemacht",
        "gemocht",
        "gemusst",
        "genug",
        "gerade",
        "gern",
        "gesagt",
        "geschweige",
        "gewesen",
        "gewollt",
        "geworden",
        "gibt",
        "ging",
        "gleich",
        "gott",
        "gross",
        "groß",
        "grosse",
        "große",
        "grossen",
        "großen",
        "grosser",
        "großer",
        "grosses",
        "großes",
        "gut",
        "gute",
        "guter",
        "gutes",
        "h",
        "habe",
        "haben",
        "habt",
        "hast",
        "hat",
        "hatte",
        "hätte",
        "hatten",
        "hätten",
        "heisst",
        "her",
        "heute",
        "hier",
        "hin",
        "hinter",
        "hoch",
        "i",
        "ich",
        "ihm",
        "ihn",
        "ihnen",
        "ihr",
        "ihre",
        "ihrem",
        "ihren",
        "ihrer",
        "ihres",
        "im",
        "immer",
        "in",
        "indem",
        "infolgedessen",
        "ins",
        "irgend",
        "ist",
        "j",
        "ja",
        "jahr",
        "jahre",
        "jahren",
        "je",
        "jede",
        "jedem",
        "jeden",
        "jeder",
        "jedermann",
        "jedermanns",
        "jedoch",
        "jemand",
        "jemandem",
        "jemanden",
        "jene",
        "jenem",
        "jenen",
        "jener",
        "jenes",
        "jetzt",
        "k",
        "kam",
        "kann",
        "kannst",
        "kaum",
        "kein",
        "keine",
        "keinem",
        "keinen",
        "keiner",
        "kleine",
        "kleinen",
        "kleiner",
        "kleines",
        "kommen",
        "kommt",
        "können",
        "könnt",
        "konnte",
        "könnte",
        "konnten",
        "kurz",
        "l",
        "lang",
        "lange",
        "leicht",
        "leide",
        "lieber",
        "los",
        "m",
        "machen",
        "macht",
        "machte",
        "mag",
        "magst",
        "mahn",
        "man",
        "manche",
        "manchem",
        "manchen",
        "mancher",
        "manches",
        "mann",
        "mehr",
        "mein",
        "meine",
        "meinem",
        "meinen",
        "meiner",
        "meines",
        "mensch",
        "menschen",
        "mich",
        "mir",
        "mit",
        "mittel",
        "mochte",
        "möchte",
        "mochten",
        "mögen",
        "möglich",
        "mögt",
        "morgen",
        "muss",
        "muß",
        "müssen",
        "musst",
        "müsst",
        "musste",
        "mussten",
        "n",
        "na",
        "nach",
        "nachdem",
        "nahm",
        "natürlich",
        "neben",
        "nein",
        "neue",
        "neuen",
        "neun",
        "neunte",
        "neunten",
        "neunter",
        "neuntes",
        "nicht",
        "nichts",
        "nie",
        "niemand",
        "niemandem",
        "niemanden",
        "noch",
        "nun",
        "nur",
        "o",
        "ob",
        "oben",
        "oder",
        "offen",
        "oft",
        "ohne",
        "Ordnung",
        "p",
        "q",
        "r",
        "recht",
        "rechte",
        "rechten",
        "rechter",
        "rechtes",
        "richtig",
        "rund",
        "s",
        "sa",
        "sache",
        "sagt",
        "sagte",
        "sah",
        "satt",
        "schlecht",
        "Schluss",
        "schon",
        "sechs",
        "sechste",
        "sechsten",
        "sechster",
        "sechstes",
        "sehr",
        "sei",
        "seid",
        "seien",
        "sein",
        "seine",
        "seinem",
        "seinen",
        "seiner",
        "seines",
        "seit",
        "seitdem",
        "selbst",
        "sich",
        "sie",
        "sieben",
        "siebente",
        "siebenten",
        "siebenter",
        "siebentes",
        "sind",
        "so",
        "solang",
        "solche",
        "solchem",
        "solchen",
        "solcher",
        "solches",
        "soll",
        "sollen",
        "sollte",
        "sollten",
        "sondern",
        "sonst",
        "sowie",
        "später",
        "statt",
        "t",
        "tag",
        "tage",
        "tagen",
        "tat",
        "teil",
        "tel",
        "tritt",
        "trotzdem",
        "tun",
        "u",
        "über",
        "überhaupt",
        "übrigens",
        "uhr",
        "um",
        "und",
        "und?",
        "uns",
        "unser",
        "unsere",
        "unserer",
        "unter",
        "v",
        "vergangenen",
        "viel",
        "viele",
        "vielem",
        "vielen",
        "vielleicht",
        "vier",
        "vierte",
        "vierten",
        "vierter",
        "viertes",
        "vom",
        "von",
        "vor",
        "w",
        "wahr?",
        "während",
        "währenddem",
        "währenddessen",
        "wann",
        "war",
        "wäre",
        "waren",
        "wart",
        "warum",
        "was",
        "wegen",
        "weil",
        "weit",
        "weiter",
        "weitere",
        "weiteren",
        "weiteres",
        "welche",
        "welchem",
        "welchen",
        "welcher",
        "welches",
        "wem",
        "wen",
        "wenig",
        "wenige",
        "weniger",
        "weniges",
        "wenigstens",
        "wenn",
        "wer",
        "werde",
        "werden",
        "werdet",
        "wessen",
        "wie",
        "wieder",
        "will",
        "willst",
        "wir",
        "wird",
        "wirklich",
        "wirst",
        "wo",
        "wohl",
        "wollen",
        "wollt",
        "wollte",
        "wollten",
        "worden",
        "wurde",
        "würde",
        "wurden",
        "würden",
        "x",
        "y",
        "z",
        "z.b",
        "zehn",
        "zehnte",
        "zehnten",
        "zehnter",
        "zehntes",
        "zeit",
        "zu",
        "zuerst",
        "zugleich",
        "zum",
        "zunächst",
        "zur",
        "zurück",
        "zusammen",
        "zwanzig",
        "zwar",
        "zwei",
        "zweite",
        "zweiten",
        "zweiter",
        "zweites",
        "zwischen",
        "zwölf",
        "﻿aber",
        "euer",
        "eure",
        "hattest",
        "hattet",
        "jedes",
        "mußt",
        "müßt",
        "sollst",
        "sollt",
        "soweit",
        "weshalb",
        "wieso",
        "woher",
        "wohin"
    ]

};
},{}],6:[function(require,module,exports){
// via http://jmlr.org/papers/volume5/lewis04a/a11-smart-stop-list/english.stop
module.exports = {
    stopwords:[
        "a",
        "a's",
        "able",
        "about",
        "above",
        "according",
        "accordingly",
        "across",
        "actually",
        "after",
        "afterwards",
        "again",
        "against",
        "ain't",
        "all",
        "allow",
        "allows",
        "almost",
        "alone",
        "along",
        "already",
        "also",
        "although",
        "always",
        "am",
        "among",
        "amongst",
        "an",
        "and",
        "another",
        "any",
        "anybody",
        "anyhow",
        "anyone",
        "anything",
        "anyway",
        "anyways",
        "anywhere",
        "apart",
        "appear",
        "appreciate",
        "appropriate",
        "are",
        "aren't",
        "around",
        "as",
        "aside",
        "ask",
        "asking",
        "associated",
        "at",
        "available",
        "away",
        "awfully",
        "b",
        "be",
        "became",
        "because",
        "become",
        "becomes",
        "becoming",
        "been",
        "before",
        "beforehand",
        "behind",
        "being",
        "believe",
        "below",
        "beside",
        "besides",
        "best",
        "better",
        "between",
        "beyond",
        "both",
        "brief",
        "but",
        "by",
        "c",
        "c'mon",
        "c's",
        "came",
        "can",
        "can't",
        "cannot",
        "cant",
        "cause",
        "causes",
        "certain",
        "certainly",
        "changes",
        "clearly",
        "co",
        "com",
        "come",
        "comes",
        "concerning",
        "consequently",
        "consider",
        "considering",
        "contain",
        "containing",
        "contains",
        "corresponding",
        "could",
        "couldn't",
        "course",
        "currently",
        "d",
        "definitely",
        "described",
        "despite",
        "did",
        "didn't",
        "different",
        "do",
        "does",
        "doesn't",
        "doing",
        "don't",
        "done",
        "down",
        "downwards",
        "during",
        "e",
        "each",
        "edu",
        "eg",
        "eight",
        "either",
        "else",
        "elsewhere",
        "enough",
        "entirely",
        "especially",
        "et",
        "etc",
        "even",
        "ever",
        "every",
        "everybody",
        "everyone",
        "everything",
        "everywhere",
        "ex",
        "exactly",
        "example",
        "except",
        "f",
        "far",
        "few",
        "fifth",
        "first",
        "five",
        "followed",
        "following",
        "follows",
        "for",
        "former",
        "formerly",
        "forth",
        "four",
        "from",
        "further",
        "furthermore",
        "g",
        "get",
        "gets",
        "getting",
        "given",
        "gives",
        "go",
        "goes",
        "going",
        "gone",
        "got",
        "gotten",
        "greetings",
        "h",
        "had",
        "hadn't",
        "happens",
        "hardly",
        "has",
        "hasn't",
        "have",
        "haven't",
        "having",
        "he",
        "he's",
        "hello",
        "help",
        "hence",
        "her",
        "here",
        "here's",
        "hereafter",
        "hereby",
        "herein",
        "hereupon",
        "hers",
        "herself",
        "hi",
        "him",
        "himself",
        "his",
        "hither",
        "hopefully",
        "how",
        "howbeit",
        "however",
        "i",
        "i'd",
        "i'll",
        "i'm",
        "i've",
        "ie",
        "if",
        "ignored",
        "immediate",
        "in",
        "inasmuch",
        "inc",
        "indeed",
        "indicate",
        "indicated",
        "indicates",
        "inner",
        "insofar",
        "instead",
        "into",
        "inward",
        "is",
        "isn't",
        "it",
        "it'd",
        "it'll",
        "it's",
        "its",
        "itself",
        "j",
        "just",
        "k",
        "keep",
        "keeps",
        "kept",
        "know",
        "knows",
        "known",
        "l",
        "last",
        "lately",
        "later",
        "latter",
        "latterly",
        "least",
        "less",
        "lest",
        "let",
        "let's",
        "like",
        "liked",
        "likely",
        "little",
        "look",
        "looking",
        "looks",
        "ltd",
        "m",
        "mainly",
        "many",
        "may",
        "maybe",
        "me",
        "mean",
        "meanwhile",
        "merely",
        "might",
        "more",
        "moreover",
        "most",
        "mostly",
        "much",
        "must",
        "my",
        "myself",
        "n",
        "name",
        "namely",
        "nd",
        "near",
        "nearly",
        "necessary",
        "need",
        "needs",
        "neither",
        "never",
        "nevertheless",
        "new",
        "next",
        "nine",
        "no",
        "nobody",
        "non",
        "none",
        "noone",
        "nor",
        "normally",
        "not",
        "nothing",
        "novel",
        "now",
        "nowhere",
        "o",
        "obviously",
        "of",
        "off",
        "often",
        "oh",
        "ok",
        "okay",
        "old",
        "on",
        "once",
        "one",
        "ones",
        "only",
        "onto",
        "or",
        "other",
        "others",
        "otherwise",
        "ought",
        "our",
        "ours",
        "ourselves",
        "out",
        "outside",
        "over",
        "overall",
        "own",
        "p",
        "particular",
        "particularly",
        "per",
        "perhaps",
        "placed",
        "please",
        "plus",
        "possible",
        "presumably",
        "probably",
        "provides",
        "q",
        "que",
        "quite",
        "qv",
        "r",
        "rather",
        "rd",
        "re",
        "really",
        "reasonably",
        "regarding",
        "regardless",
        "regards",
        "relatively",
        "respectively",
        "right",
        "s",
        "said",
        "same",
        "saw",
        "say",
        "saying",
        "says",
        "second",
        "secondly",
        "see",
        "seeing",
        "seem",
        "seemed",
        "seeming",
        "seems",
        "seen",
        "self",
        "selves",
        "sensible",
        "sent",
        "serious",
        "seriously",
        "seven",
        "several",
        "shall",
        "she",
        "should",
        "shouldn't",
        "since",
        "six",
        "so",
        "some",
        "somebody",
        "somehow",
        "someone",
        "something",
        "sometime",
        "sometimes",
        "somewhat",
        "somewhere",
        "soon",
        "sorry",
        "specified",
        "specify",
        "specifying",
        "still",
        "sub",
        "such",
        "sup",
        "sure",
        "t",
        "t's",
        "take",
        "taken",
        "tell",
        "tends",
        "th",
        "than",
        "thank",
        "thanks",
        "thanx",
        "that",
        "that's",
        "thats",
        "the",
        "their",
        "theirs",
        "them",
        "themselves",
        "then",
        "thence",
        "there",
        "there's",
        "thereafter",
        "thereby",
        "therefore",
        "therein",
        "theres",
        "thereupon",
        "these",
        "they",
        "they'd",
        "they'll",
        "they're",
        "they've",
        "think",
        "third",
        "this",
        "thorough",
        "thoroughly",
        "those",
        "though",
        "three",
        "through",
        "throughout",
        "thru",
        "thus",
        "to",
        "together",
        "too",
        "took",
        "toward",
        "towards",
        "tried",
        "tries",
        "truly",
        "try",
        "trying",
        "twice",
        "two",
        "u",
        "un",
        "under",
        "unfortunately",
        "unless",
        "unlikely",
        "until",
        "unto",
        "up",
        "upon",
        "us",
        "use",
        "used",
        "useful",
        "uses",
        "using",
        "usually",
        "uucp",
        "v",
        "value",
        "various",
        "very",
        "via",
        "viz",
        "vs",
        "w",
        "want",
        "wants",
        "was",
        "wasn't",
        "way",
        "we",
        "we'd",
        "we'll",
        "we're",
        "we've",
        "welcome",
        "well",
        "went",
        "were",
        "weren't",
        "what",
        "what's",
        "whatever",
        "when",
        "whence",
        "whenever",
        "where",
        "where's",
        "whereafter",
        "whereas",
        "whereby",
        "wherein",
        "whereupon",
        "wherever",
        "whether",
        "which",
        "while",
        "whither",
        "who",
        "who's",
        "whoever",
        "whole",
        "whom",
        "whose",
        "why",
        "will",
        "willing",
        "wish",
        "with",
        "within",
        "without",
        "won't",
        "wonder",
        "would",
        "would",
        "wouldn't",
        "x",
        "y",
        "yes",
        "yet",
        "you",
        "you'd",
        "you'll",
        "you're",
        "you've",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "z",
        "zero"
    ]
};
},{}],7:[function(require,module,exports){
//  via https://stop-words.googlecode.com/svn/trunk/stop-words/stop-words/stop-words-spanish.txt
module.exports = {
    stopwords: [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '_',
        'a',
        'actualmente',
        'acuerdo',
        'adelante',
        'ademas',
        'además',
        'adrede',
        'afirmó',
        'agregó',
        'ahi',
        'ahora',
        'ahí',
        'al',
        'algo',
        'alguna',
        'algunas',
        'alguno',
        'algunos',
        'algún',
        'alli',
        'allí',
        'alrededor',
        'ambos',
        'ampleamos',
        'antano',
        'antaño',
        'ante',
        'anterior',
        'antes',
        'apenas',
        'aproximadamente',
        'aquel',
        'aquella',
        'aquellas',
        'aquello',
        'aquellos',
        'aqui',
        'aquél',
        'aquélla',
        'aquéllas',
        'aquéllos',
        'aquí',
        'arriba',
        'arribaabajo',
        'aseguró',
        'asi',
        'así',
        'atras',
        'aun',
        'aunque',
        'ayer',
        'añadió',
        'aún',
        'b',
        'bajo',
        'bastante',
        'bien',
        'breve',
        'buen',
        'buena',
        'buenas',
        'bueno',
        'buenos',
        'c',
        'cada',
        'casi',
        'cerca',
        'cierta',
        'ciertas',
        'cierto',
        'ciertos',
        'cinco',
        'claro',
        'comentó',
        'como',
        'con',
        'conmigo',
        'conocer',
        'conseguimos',
        'conseguir',
        'considera',
        'consideró',
        'consigo',
        'consigue',
        'consiguen',
        'consigues',
        'contigo',
        'contra',
        'cosas',
        'creo',
        'cual',
        'cuales',
        'cualquier',
        'cuando',
        'cuanta',
        'cuantas',
        'cuanto',
        'cuantos',
        'cuatro',
        'cuenta',
        'cuál',
        'cuáles',
        'cuándo',
        'cuánta',
        'cuántas',
        'cuánto',
        'cuántos',
        'cómo',
        'd',
        'da',
        'dado',
        'dan',
        'dar',
        'de',
        'debajo',
        'debe',
        'deben',
        'debido',
        'decir',
        'dejó',
        'del',
        'delante',
        'demasiado',
        'demás',
        'dentro',
        'deprisa',
        'desde',
        'despacio',
        'despues',
        'después',
        'detras',
        'detrás',
        'dia',
        'dias',
        'dice',
        'dicen',
        'dicho',
        'dieron',
        'diferente',
        'diferentes',
        'dijeron',
        'dijo',
        'dio',
        'donde',
        'dos',
        'durante',
        'día',
        'días',
        'dónde',
        'e',
        'ejemplo',
        'el',
        'ella',
        'ellas',
        'ello',
        'ellos',
        'embargo',
        'empleais',
        'emplean',
        'emplear',
        'empleas',
        'empleo',
        'en',
        'encima',
        'encuentra',
        'enfrente',
        'enseguida',
        'entonces',
        'entre',
        'era',
        'erais',
        'eramos',
        'eran',
        'eras',
        'eres',
        'es',
        'esa',
        'esas',
        'ese',
        'eso',
        'esos',
        'esta',
        'estaba',
        'estabais',
        'estaban',
        'estabas',
        'estad',
        'estada',
        'estadas',
        'estado',
        'estados',
        'estais',
        'estamos',
        'estan',
        'estando',
        'estar',
        'estaremos',
        'estará',
        'estarán',
        'estarás',
        'estaré',
        'estaréis',
        'estaría',
        'estaríais',
        'estaríamos',
        'estarían',
        'estarías',
        'estas',
        'este',
        'estemos',
        'esto',
        'estos',
        'estoy',
        'estuve',
        'estuviera',
        'estuvierais',
        'estuvieran',
        'estuvieras',
        'estuvieron',
        'estuviese',
        'estuvieseis',
        'estuviesen',
        'estuvieses',
        'estuvimos',
        'estuviste',
        'estuvisteis',
        'estuviéramos',
        'estuviésemos',
        'estuvo',
        'está',
        'estábamos',
        'estáis',
        'están',
        'estás',
        'esté',
        'estéis',
        'estén',
        'estés',
        'ex',
        'excepto',
        'existe',
        'existen',
        'explicó',
        'expresó',
        'f',
        'fin',
        'final',
        'fue',
        'fuera',
        'fuerais',
        'fueran',
        'fueras',
        'fueron',
        'fuese',
        'fueseis',
        'fuesen',
        'fueses',
        'fui',
        'fuimos',
        'fuiste',
        'fuisteis',
        'fuéramos',
        'fuésemos',
        'g',
        'general',
        'gran',
        'grandes',
        'gueno',
        'h',
        'ha',
        'haber',
        'habia',
        'habida',
        'habidas',
        'habido',
        'habidos',
        'habiendo',
        'habla',
        'hablan',
        'habremos',
        'habrá',
        'habrán',
        'habrás',
        'habré',
        'habréis',
        'habría',
        'habríais',
        'habríamos',
        'habrían',
        'habrías',
        'habéis',
        'había',
        'habíais',
        'habíamos',
        'habían',
        'habías',
        'hace',
        'haceis',
        'hacemos',
        'hacen',
        'hacer',
        'hacerlo',
        'haces',
        'hacia',
        'haciendo',
        'hago',
        'han',
        'has',
        'hasta',
        'hay',
        'haya',
        'hayamos',
        'hayan',
        'hayas',
        'hayáis',
        'he',
        'hecho',
        'hemos',
        'hicieron',
        'hizo',
        'horas',
        'hoy',
        'hube',
        'hubiera',
        'hubierais',
        'hubieran',
        'hubieras',
        'hubieron',
        'hubiese',
        'hubieseis',
        'hubiesen',
        'hubieses',
        'hubimos',
        'hubiste',
        'hubisteis',
        'hubiéramos',
        'hubiésemos',
        'hubo',
        'i',
        'igual',
        'incluso',
        'indicó',
        'informo',
        'informó',
        'intenta',
        'intentais',
        'intentamos',
        'intentan',
        'intentar',
        'intentas',
        'intento',
        'ir',
        'j',
        'junto',
        'k',
        'l',
        'la',
        'lado',
        'largo',
        'las',
        'le',
        'lejos',
        'les',
        'llegó',
        'lleva',
        'llevar',
        'lo',
        'los',
        'luego',
        'lugar',
        'm',
        'mal',
        'manera',
        'manifestó',
        'mas',
        'mayor',
        'me',
        'mediante',
        'medio',
        'mejor',
        'mencionó',
        'menos',
        'menudo',
        'mi',
        'mia',
        'mias',
        'mientras',
        'mio',
        'mios',
        'mis',
        'misma',
        'mismas',
        'mismo',
        'mismos',
        'modo',
        'momento',
        'mucha',
        'muchas',
        'mucho',
        'muchos',
        'muy',
        'más',
        'mí',
        'mía',
        'mías',
        'mío',
        'míos',
        'n',
        'nada',
        'nadie',
        'ni',
        'ninguna',
        'ningunas',
        'ninguno',
        'ningunos',
        'ningún',
        'no',
        'nos',
        'nosotras',
        'nosotros',
        'nuestra',
        'nuestras',
        'nuestro',
        'nuestros',
        'nueva',
        'nuevas',
        'nuevo',
        'nuevos',
        'nunca',
        'o',
        'ocho',
        'os',
        'otra',
        'otras',
        'otro',
        'otros',
        'p',
        'pais',
        'para',
        'parece',
        'parte',
        'partir',
        'pasada',
        'pasado',
        'paìs',
        'peor',
        'pero',
        'pesar',
        'poca',
        'pocas',
        'poco',
        'pocos',
        'podeis',
        'podemos',
        'poder',
        'podria',
        'podría',
        'podriais',
        'podriamos',
        'podrian',
        'podrias',
        'podrá',
        'podrán',
        'podría',
        'podrían',
        'poner',
        'por',
        'por qué',
        'porque',
        'posible',
        'primer',
        'primera',
        'primero',
        'primeros',
        'principalmente',
        'pronto',
        'propia',
        'propias',
        'propio',
        'propios',
        'proximo',
        'próximo',
        'próximos',
        'pudo',
        'pueda',
        'puede',
        'pueden',
        'puedo',
        'pues',
        'q',
        'qeu',
        'que',
        'quedó',
        'queremos',
        'quien',
        'quienes',
        'quiere',
        'quiza',
        'quizas',
        'quizá',
        'quizás',
        'quién',
        'quiénes',
        'qué',
        'r',
        'raras',
        'realizado',
        'realizar',
        'realizó',
        'repente',
        'respecto',
        's',
        'sabe',
        'sabeis',
        'sabemos',
        'saben',
        'saber',
        'sabes',
        'sal',
        'salvo',
        'se',
        'sea',
        'seamos',
        'sean',
        'seas',
        'segun',
        'segunda',
        'segundo',
        'según',
        'seis',
        'ser',
        'sera',
        'seremos',
        'será',
        'serán',
        'serás',
        'seré',
        'seréis',
        'sería',
        'seríais',
        'seríamos',
        'serían',
        'serías',
        'seáis',
        'señaló',
        'si',
        'sido',
        'siempre',
        'siendo',
        'siete',
        'sigue',
        'siguiente',
        'sin',
        'sino',
        'sobre',
        'sois',
        'sola',
        'solamente',
        'solas',
        'solo',
        'solos',
        'somos',
        'son',
        'soy',
        'soyos',
        'su',
        'supuesto',
        'sus',
        'suya',
        'suyas',
        'suyo',
        'suyos',
        'sé',
        'sí',
        'sólo',
        't',
        'tal',
        'tambien',
        'también',
        'tampoco',
        'tan',
        'tanto',
        'tarde',
        'te',
        'temprano',
        'tendremos',
        'tendrá',
        'tendrán',
        'tendrás',
        'tendré',
        'tendréis',
        'tendría',
        'tendríais',
        'tendríamos',
        'tendrían',
        'tendrías',
        'tened',
        'teneis',
        'tenemos',
        'tener',
        'tenga',
        'tengamos',
        'tengan',
        'tengas',
        'tengo',
        'tengáis',
        'tenida',
        'tenidas',
        'tenido',
        'tenidos',
        'teniendo',
        'tenéis',
        'tenía',
        'teníais',
        'teníamos',
        'tenían',
        'tenías',
        'tercera',
        'ti',
        'tiempo',
        'tiene',
        'tienen',
        'tienes',
        'toda',
        'todas',
        'todavia',
        'todavía',
        'todo',
        'todos',
        'total',
        'trabaja',
        'trabajais',
        'trabajamos',
        'trabajan',
        'trabajar',
        'trabajas',
        'trabajo',
        'tras',
        'trata',
        'través',
        'tres',
        'tu',
        'tus',
        'tuve',
        'tuviera',
        'tuvierais',
        'tuvieran',
        'tuvieras',
        'tuvieron',
        'tuviese',
        'tuvieseis',
        'tuviesen',
        'tuvieses',
        'tuvimos',
        'tuviste',
        'tuvisteis',
        'tuviéramos',
        'tuviésemos',
        'tuvo',
        'tuya',
        'tuyas',
        'tuyo',
        'tuyos',
        'tú',
        'u',
        'ultimo',
        'un',
        'una',
        'unas',
        'uno',
        'unos',
        'usa',
        'usais',
        'usamos',
        'usan',
        'usar',
        'usas',
        'uso',
        'usted',
        'ustedes',
        'v',
        'va',
        'vais',
        'valor',
        'vamos',
        'van',
        'varias',
        'varios',
        'vaya',
        'veces',
        'ver',
        'verdad',
        'verdadera',
        'verdadero',
        'vez',
        'vosotras',
        'vosotros',
        'voy',
        'vuestra',
        'vuestras',
        'vuestro',
        'vuestros',
        'w',
        'x',
        'y',
        'ya',
        'yo',
        'z',
        'él',
        'éramos',
        'ésa',
        'ésas',
        'ése',
        'ésos',
        'ésta',
        'éstas',
        'éste',
        'éstos',
        'última',
        'últimas',
        'último',
        'últimos'
    ]

};

},{}],8:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// French stopwords
// via https://code.google.com/p/stop-words/

module.exports = {
    stopwords: [
        "a",
        "à",
        "â",
        "abord",
        "afin",
        "ah",
        "ai",
        "aie",
        "ainsi",
        "allaient",
        "allo",
        "allô",
        "allons",
        "après",
        "assez",
        "attendu",
        "au",
        "aucun",
        "aucune",
        "aujourd",
        "aujourd'hui",
        "auquel",
        "aura",
        "auront",
        "aussi",
        "autre",
        "autres",
        "aux",
        "auxquelles",
        "auxquels",
        "avaient",
        "avais",
        "avait",
        "avant",
        "avec",
        "avoir",
        "ayant",
        "b",
        "bah",
        "beaucoup",
        "bien",
        "bigre",
        "boum",
        "bravo",
        "brrr",
        "c",
        "ça",
        "car",
        "ce",
        "ceci",
        "cela",
        "celle",
        "celle-ci",
        "celle-là",
        "celles",
        "celles-ci",
        "celles-là",
        "celui",
        "celui-ci",
        "celui-là",
        "cent",
        "cependant",
        "certain",
        "certaine",
        "certaines",
        "certains",
        "certes",
        "ces",
        "cet",
        "cette",
        "ceux",
        "ceux-ci",
        "ceux-là",
        "chacun",
        "chaque",
        "cher",
        "chère",
        "chères",
        "chers",
        "chez",
        "chiche",
        "chut",
        "ci",
        "cinq",
        "cinquantaine",
        "cinquante",
        "cinquantième",
        "cinquième",
        "clac",
        "clic",
        "combien",
        "comme",
        "comment",
        "compris",
        "concernant",
        "contre",
        "couic",
        "crac",
        "d",
        "da",
        "dans",
        "de",
        "debout",
        "dedans",
        "dehors",
        "delà",
        "depuis",
        "derrière",
        "des",
        "dès",
        "désormais",
        "desquelles",
        "desquels",
        "dessous",
        "dessus",
        "deux",
        "deuxième",
        "deuxièmement",
        "devant",
        "devers",
        "devra",
        "différent",
        "différente",
        "différentes",
        "différents",
        "dire",
        "divers",
        "diverse",
        "diverses",
        "dix",
        "dix-huit",
        "dixième",
        "dix-neuf",
        "dix-sept",
        "doit",
        "doivent",
        "donc",
        "dont",
        "douze",
        "douzième",
        "dring",
        "du",
        "duquel",
        "durant",
        "e",
        "effet",
        "eh",
        "elle",
        "elle-même",
        "elles",
        "elles-mêmes",
        "en",
        "encore",
        "entre",
        "envers",
        "environ",
        "es",
        "ès",
        "est",
        "et",
        "etant",
        "étaient",
        "étais",
        "était",
        "étant",
        "etc",
        "été",
        "etre",
        "être",
        "eu",
        "euh",
        "eux",
        "eux-mêmes",
        "excepté",
        "f",
        "façon",
        "fais",
        "faisaient",
        "faisant",
        "fait",
        "feront",
        "fi",
        "flac",
        "floc",
        "font",
        "g",
        "gens",
        "h",
        "ha",
        "hé",
        "hein",
        "hélas",
        "hem",
        "hep",
        "hi",
        "ho",
        "holà",
        "hop",
        "hormis",
        "hors",
        "hou",
        "houp",
        "hue",
        "hui",
        "huit",
        "huitième",
        "hum",
        "hurrah",
        "i",
        "il",
        "ils",
        "importe",
        "j",
        "je",
        "jusqu",
        "jusque",
        "k",
        "l",
        "la",
        "là",
        "laquelle",
        "las",
        "le",
        "lequel",
        "les",
        "lès",
        "lesquelles",
        "lesquels",
        "leur",
        "leurs",
        "longtemps",
        "lorsque",
        "lui",
        "lui-même",
        "m",
        "ma",
        "maint",
        "mais",
        "malgré",
        "me",
        "même",
        "mêmes",
        "merci",
        "mes",
        "mien",
        "mienne",
        "miennes",
        "miens",
        "mille",
        "mince",
        "moi",
        "moi-même",
        "moins",
        "mon",
        "moyennant",
        "n",
        "na",
        "ne",
        "néanmoins",
        "neuf",
        "neuvième",
        "ni",
        "nombreuses",
        "nombreux",
        "non",
        "nos",
        "notre",
        "nôtre",
        "nôtres",
        "nous",
        "nous-mêmes",
        "nul",
        "o",
        "o|",
        "ô",
        "oh",
        "ohé",
        "olé",
        "ollé",
        "on",
        "ont",
        "onze",
        "onzième",
        "ore",
        "ou",
        "où",
        "ouf",
        "ouias",
        "oust",
        "ouste",
        "outre",
        "p",
        "paf",
        "pan",
        "par",
        "parmi",
        "partant",
        "particulier",
        "particulière",
        "particulièrement",
        "pas",
        "passé",
        "pendant",
        "personne",
        "peu",
        "peut",
        "peuvent",
        "peux",
        "pff",
        "pfft",
        "pfut",
        "pif",
        "plein",
        "plouf",
        "plus",
        "plusieurs",
        "plutôt",
        "pouah",
        "pour",
        "pourquoi",
        "premier",
        "première",
        "premièrement",
        "près",
        "proche",
        "psitt",
        "puisque",
        "q",
        "qu",
        "quand",
        "quant",
        "quanta",
        "quant-à-soi",
        "quarante",
        "quatorze",
        "quatre",
        "quatre-vingt",
        "quatrième",
        "quatrièmement",
        "que",
        "quel",
        "quelconque",
        "quelle",
        "quelles",
        "quelque",
        "quelques",
        "quelqu'un",
        "quels",
        "qui",
        "quiconque",
        "quinze",
        "quoi",
        "quoique",
        "r",
        "revoici",
        "revoilà",
        "rien",
        "s",
        "sa",
        "sacrebleu",
        "sans",
        "sapristi",
        "sauf",
        "se",
        "seize",
        "selon",
        "sept",
        "septième",
        "sera",
        "seront",
        "ses",
        "si",
        "sien",
        "sienne",
        "siennes",
        "siens",
        "sinon",
        "six",
        "sixième",
        "soi",
        "soi-même",
        "soit",
        "soixante",
        "son",
        "sont",
        "sous",
        "stop",
        "suis",
        "suivant",
        "sur",
        "surtout",
        "t",
        "ta",
        "tac",
        "tant",
        "te",
        "té",
        "tel",
        "telle",
        "tellement",
        "telles",
        "tels",
        "tenant",
        "tes",
        "tic",
        "tien",
        "tienne",
        "tiennes",
        "tiens",
        "toc",
        "toi",
        "toi-même",
        "ton",
        "touchant",
        "toujours",
        "tous",
        "tout",
        "toute",
        "toutes",
        "treize",
        "trente",
        "très",
        "trois",
        "troisième",
        "troisièmement",
        "trop",
        "tsoin",
        "tsouin",
        "tu",
        "u",
        "un",
        "une",
        "unes",
        "uns",
        "v",
        "va",
        "vais",
        "vas",
        "vé",
        "vers",
        "via",
        "vif",
        "vifs",
        "vingt",
        "vivat",
        "vive",
        "vives",
        "vlan",
        "voici",
        "voilà",
        "vont",
        "vos",
        "votre",
        "vôtre",
        "vôtres",
        "vous",
        "vous-mêmes",
        "vu",
        "w",
        "x",
        "y",
        "z",
        "zut",
        "﻿alors",
        "aucuns",
        "bon",
        "devrait",
        "dos",
        "droite",
        "début",
        "essai",
        "faites",
        "fois",
        "force",
        "haut",
        "ici",
        "juste",
        "maintenant",
        "mine",
        "mot",
        "nommés",
        "nouveaux",
        "parce",
        "parole",
        "personnes",
        "pièce",
        "plupart",
        "seulement",
        "soyez",
        "sujet",
        "tandis",
        "valeur",
        "voie",
        "voient",
        "état",
        "étions"

    ]

};

},{}],9:[function(require,module,exports){
//  via http://www.ranks.nl/stopwords/galician
module.exports = {
    stopwords: [
        'a',
        'aínda',
        'alí',
        'aquel',
        'aquela',
        'aquelas',
        'aqueles',
        'aquilo',
        'aquí',
        'ao',
        'aos',
        'as',
        'así',
        'á',
        'ben',
        'cando',
        'che',
        'co',
        'coa',
        'comigo',
        'con',
        'connosco',
        'contigo',
        'convosco',
        'coas',
        'cos',
        'cun',
        'cuns',
        'cunha',
        'cunhas',
        'da',
        'dalgunha',
        'dalgunhas',
        'dalgún',
        'dalgúns',
        'das',
        'de',
        'del',
        'dela',
        'delas',
        'deles',
        'desde',
        'deste',
        'do',
        'dos',
        'dun',
        'duns',
        'dunha',
        'dunhas',
        'e',
        'el',
        'ela',
        'elas',
        'eles',
        'en',
        'era',
        'eran',
        'esa',
        'esas',
        'ese',
        'eses',
        'esta',
        'estar',
        'estaba',
        'está',
        'están',
        'este',
        'estes',
        'estiven',
        'estou',
        'eu',
        'é',
        'facer',
        'foi',
        'foron',
        'fun',
        'había',
        'hai',
        'iso',
        'isto',
        'la',
        'las',
        'lle',
        'lles',
        'lo',
        'los',
        'mais',
        'me',
        'meu',
        'meus',
        'min',
        'miña',
        'miñas',
        'moi',
        'na',
        'nas',
        'neste',
        'nin',
        'no',
        'non',
        'nos',
        'nosa',
        'nosas',
        'noso',
        'nosos',
        'nós',
        'nun',
        'nunha',
        'nuns',
        'nunhas',
        'o',
        'os',
        'ou',
        'ó',
        'ós',
        'para',
        'pero',
        'pode',
        'pois',
        'pola',
        'polas',
        'polo',
        'polos',
        'por',
        'que',
        'se',
        'senón',
        'ser',
        'seu',
        'seus',
        'sexa',
        'sido',
        'sobre',
        'súa',
        'súas',
        'tamén',
        'tan',
        'te',
        'ten',
        'teñen',
        'teño',
        'ter',
        'teu',
        'teus',
        'ti',
        'tido',
        'tiña',
        'tiven',
        'túa',
        'túas',
        'un',
        'unha',
        'unhas',
        'uns',
        'vos',
        'vosa',
        'vosas',
        'voso',
        'vosos',
        'vós'
    ]
};

},{}],10:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// Italian stopwords
// via https://code.google.com/p/stop-words/

module.exports = {
    stopwords: [
        "a",
        "adesso",
        "ai",
        "al",
        "alla",
        "allo",
        "allora",
        "altre",
        "altri",
        "altro",
        "anche",
        "ancora",
        "avere",
        "aveva",
        "avevano",
        "ben",
        "buono",
        "che",
        "chi",
        "cinque",
        "comprare",
        "con",
        "consecutivi",
        "consecutivo",
        "cosa",
        "cui",
        "da",
        "del",
        "della",
        "dello",
        "dentro",
        "deve",
        "devo",
        "di",
        "doppio",
        "due",
        "e",
        "ecco",
        "fare",
        "fine",
        "fino",
        "fra",
        "gente",
        "giu",
        "ha",
        "hai",
        "hanno",
        "ho",
        "il",
        "indietro",
        "invece",
        "io",
        "la",
        "lavoro",
        "le",
        "lei",
        "lo",
        "loro",
        "lui",
        "lungo",
        "ma",
        "me",
        "meglio",
        "molta",
        "molti",
        "molto",
        "nei",
        "nella",
        "no",
        "noi",
        "nome",
        "nostro",
        "nove",
        "nuovi",
        "nuovo",
        "o",
        "oltre",
        "ora",
        "otto",
        "peggio",
        "pero",
        "persone",
        "piu",
        "poco",
        "primo",
        "promesso",
        "qua",
        "quarto",
        "quasi",
        "quattro",
        "quello",
        "questo",
        "qui",
        "quindi",
        "quinto",
        "rispetto",
        "sara",
        "secondo",
        "sei",
        "sembra",
        "sembrava",
        "senza",
        "sette",
        "sia",
        "siamo",
        "siete",
        "solo",
        "sono",
        "sopra",
        "soprattutto",
        "sotto",
        "stati",
        "stato",
        "stesso",
        "su",
        "subito",
        "sul",
        "sulla",
        "tanto",
        "te",
        "tempo",
        "terzo",
        "tra",
        "tre",
        "triplo",
        "ultimo",
        "un",
        "una",
        "uno",
        "va",
        "vai",
        "voi",
        "volte",
        "vostro",
        "a",
        "abbastanza",
        "accidenti",
        "ad",
        "affinche",
        "agli",
        "ahime",
        "ahimÃ",
        "alcuna",
        "alcuni",
        "alcuno",
        "all",
        "alle",
        "altrimenti",
        "altrui",
        "anni",
        "anno",
        "ansa",
        "assai",
        "attesa",
        "avanti",
        "avendo",
        "avente",
        "aver",
        "avete",
        "avuta",
        "avute",
        "avuti",
        "avuto",
        "basta",
        "bene",
        "benissimo",
        "berlusconi",
        "brava",
        "bravo",
        "c",
        "casa",
        "caso",
        "cento",
        "certa",
        "certe",
        "certi",
        "certo",
        "chicchessia",
        "chiunque",
        "ci",
        "ciascuna",
        "ciascuno",
        "cima",
        "cio",
        "ciÃ",
        "cioe",
        "cioÃ",
        "circa",
        "citta",
        "cittÃ",
        "codesta",
        "codesti",
        "codesto",
        "cogli",
        "coi",
        "col",
        "colei",
        "coll",
        "coloro",
        "colui",
        "come",
        "concernente",
        "consiglio",
        "contro",
        "cortesia",
        "cos",
        "cosi",
        "cosÃ",
        "d",
        "dagli",
        "dai",
        "dal",
        "dall",
        "dalla",
        "dalle",
        "dallo",
        "davanti",
        "degli",
        "dei",
        "dell",
        "delle",
        "detto",
        "dice",
        "dietro",
        "dire",
        "dirimpetto",
        "dopo",
        "dove",
        "dovra",
        "dovrÃ",
        "dunque",
        "durante",
        "Ã",
        "ed",
        "egli",
        "ella",
        "eppure",
        "era",
        "erano",
        "esse",
        "essendo",
        "esser",
        "essere",
        "essi",
        "ex",
        "fa",
        "fatto",
        "favore",
        "fin",
        "finalmente",
        "finche",
        "forse",
        "fuori",
        "gia",
        "giÃ",
        "giacche",
        "giorni",
        "giorno",
        "gli",
        "gliela",
        "gliele",
        "glieli",
        "glielo",
        "gliene",
        "governo",
        "grande",
        "grazie",
        "gruppo",
        "i",
        "ieri",
        "improvviso",
        "in",
        "infatti",
        "insieme",
        "intanto",
        "intorno",
        "l",
        "lÃ",
        "li",
        "lontano",
        "macche",
        "magari",
        "mai",
        "male",
        "malgrado",
        "malissimo",
        "medesimo",
        "mediante",
        "meno",
        "mentre",
        "mesi",
        "mezzo",
        "mi",
        "mia",
        "mie",
        "miei",
        "mila",
        "miliardi",
        "milioni",
        "ministro",
        "mio",
        "moltissimo",
        "mondo",
        "nazionale",
        "ne",
        "negli",
        "nel",
        "nell",
        "nelle",
        "nello",
        "nemmeno",
        "neppure",
        "nessuna",
        "nessuno",
        "niente",
        "non",
        "nondimeno",
        "nostra",
        "nostre",
        "nostri",
        "nulla",
        "od",
        "oggi",
        "ogni",
        "ognuna",
        "ognuno",
        "oppure",
        "ore",
        "osi",
        "ossia",
        "paese",
        "parecchi",
        "parecchie",
        "parecchio",
        "parte",
        "partendo",
        "peccato",
        "per",
        "perche",
        "perchÃ",
        "percio",
        "perciÃ",
        "perfino",
        "perÃ",
        "piedi",
        "pieno",
        "piglia",
        "piÃ",
        "po",
        "pochissimo",
        "poi",
        "poiche",
        "press",
        "prima",
        "proprio",
        "puo",
        "puÃ",
        "pure",
        "purtroppo",
        "qualche",
        "qualcuna",
        "qualcuno",
        "quale",
        "quali",
        "qualunque",
        "quando",
        "quanta",
        "quante",
        "quanti",
        "quanto",
        "quantunque",
        "quel",
        "quella",
        "quelli",
        "quest",
        "questa",
        "queste",
        "questi",
        "riecco",
        "salvo",
        "sarÃ",
        "sarebbe",
        "scopo",
        "scorso",
        "se",
        "seguente",
        "sempre",
        "si",
        "solito",
        "sta",
        "staranno",
        "stata",
        "state",
        "sua",
        "successivo",
        "sue",
        "sugli",
        "sui",
        "sull",
        "sulle",
        "sullo",
        "suo",
        "suoi",
        "tale",
        "talvolta",
        "ti",
        "torino",
        "tranne",
        "troppo",
        "tu",
        "tua",
        "tue",
        "tuo",
        "tuoi",
        "tutta",
        "tuttavia",
        "tutte",
        "tutti",
        "tutto",
        "uguali",
        "uomo",
        "vale",
        "varia",
        "varie",
        "vario",
        "verso",
        "vi",
        "via",
        "vicino",
        "visto",
        "vita",
        "volta",
        "vostra",
        "vostre",
        "vostri"
    ]
};

},{}],11:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// Dutch stopwords
// via https://code.google.com/p/stop-words/



module.exports = {
    stopwords:[
        "aan",
        "af",
        "al",
        "als",
        "bij",
        "dan",
        "dat",
        "die",
        "dit",
        "een",
        "en",
        "er",
        "had",
        "heb",
        "hem",
        "het",
        "hij",
        "hoe",
        "hun",
        "ik",
        "in",
        "is",
        "je",
        "kan",
        "me",
        "men",
        "met",
        "mij",
        "nog",
        "nu",
        "of",
        "ons",
        "ook",
        "te",
        "tot",
        "uit",
        "van",
        "was",
        "wat",
        "we",
        "wel",
        "wij",
        "zal",
        "ze",
        "zei",
        "zij",
        "zo",
        "zou",
        "aan",
        "aangaande",
        "aangezien",
        "achter",
        "achterna",
        "afgelopen",
        "al",
        "aldaar",
        "aldus",
        "alhoewel",
        "alias",
        "alle",
        "allebei",
        "alleen",
        "alsnog",
        "altijd",
        "altoos",
        "ander",
        "andere",
        "anders",
        "anderszins",
        "behalve",
        "behoudens",
        "beide",
        "beiden",
        "ben",
        "beneden",
        "bent",
        "bepaald",
        "betreffende",
        "bij",
        "binnen",
        "binnenin",
        "boven",
        "bovenal",
        "bovendien",
        "bovengenoemd",
        "bovenstaand",
        "bovenvermeld",
        "buiten",
        "daar",
        "daarheen",
        "daarin",
        "daarna",
        "daarnet",
        "daarom",
        "daarop",
        "daarvanlangs",
        "dan",
        "dat",
        "de",
        "die",
        "dikwijls",
        "dit",
        "door",
        "doorgaand",
        "dus",
        "echter",
        "eer",
        "eerdat",
        "eerder",
        "eerlang",
        "eerst",
        "elk",
        "elke",
        "en",
        "enig",
        "enigszins",
        "enkel",
        "er",
        "erdoor",
        "even",
        "eveneens",
        "evenwel",
        "gauw",
        "gedurende",
        "geen",
        "gehad",
        "gekund",
        "geleden",
        "gelijk",
        "gemoeten",
        "gemogen",
        "geweest",
        "gewoon",
        "gewoonweg",
        "haar",
        "had",
        "hadden",
        "hare",
        "heb",
        "hebben",
        "hebt",
        "heeft",
        "hem",
        "hen",
        "het",
        "hierbeneden",
        "hierboven",
        "hij",
        "hoe",
        "hoewel",
        "hun",
        "hunne",
        "ik",
        "ikzelf",
        "in",
        "inmiddels",
        "inzake",
        "is",
        "jezelf",
        "jij",
        "jijzelf",
        "jou",
        "jouw",
        "jouwe",
        "juist",
        "jullie",
        "kan",
        "klaar",
        "kon",
        "konden",
        "krachtens",
        "kunnen",
        "kunt",
        "later",
        "liever",
        "maar",
        "mag",
        "meer",
        "met",
        "mezelf",
        "mij",
        "mijn",
        "mijnent",
        "mijner",
        "mijzelf",
        "misschien",
        "mocht",
        "mochten",
        "moest",
        "moesten",
        "moet",
        "moeten",
        "mogen",
        "na",
        "naar",
        "nadat",
        "net",
        "niet",
        "noch",
        "nog",
        "nogal",
        "nu",
        "of",
        "ofschoon",
        "om",
        "omdat",
        "omhoog",
        "omlaag",
        "omstreeks",
        "omtrent",
        "omver",
        "onder",
        "ondertussen",
        "ongeveer",
        "ons",
        "onszelf",
        "onze",
        "ook",
        "op",
        "opnieuw",
        "opzij",
        "over",
        "overeind",
        "overigens",
        "pas",
        "precies",
        "reeds",
        "rond",
        "rondom",
        "sedert",
        "sinds",
        "sindsdien",
        "slechts",
        "sommige",
        "spoedig",
        "steeds",
        "tamelijk",
        "tenzij",
        "terwijl",
        "thans",
        "tijdens",
        "toch",
        "toen",
        "toenmaals",
        "toenmalig",
        "tot",
        "totdat",
        "tussen",
        "uit",
        "uitgezonderd",
        "vaakwat",
        "van",
        "vandaan",
        "vanuit",
        "vanwege",
        "veeleer",
        "verder",
        "vervolgens",
        "vol",
        "volgens",
        "voor",
        "vooraf",
        "vooral",
        "vooralsnog",
        "voorbij",
        "voordat",
        "voordezen",
        "voordien",
        "voorheen",
        "voorop",
        "vooruit",
        "vrij",
        "vroeg",
        "waar",
        "waarom",
        "wanneer",
        "want",
        "waren",
        "was",
        "weer",
        "weg",
        "wegens",
        "wel",
        "weldra",
        "welk",
        "welke",
        "wie",
        "wiens",
        "wier",
        "wij",
        "wijzelf",
        "zal",
        "ze",
        "zelfs",
        "zichzelf",
        "zij",
        "zijn",
        "zijne",
        "zo",
        "zodra",
        "zonder",
        "zou",
        "zouden",
        "zowat",
        "zulke",
        "zullen",
        "zult"
    ]
};


},{}],12:[function(require,module,exports){
// via http://hackage.haskell.org/package/glider-nlp-0.1/docs/src/Glider-NLP-Language-Polish-StopWords.html
module.exports = {
    stopwords:[
        "a",
"aby",
"ach",
"acz",
"aczkolwiek",
"aj",
"albo",
"ale",
"alez",
"ależ",
"ani",
"az",
"aż",
"bardziej",
"bardzo",
"bo",
"bowiem",
"by",
"byli",
"bynajmniej",
"byc",
"być",
"byl",
"był",
"byla",
"bylo",
"byly",
"była",
"było",
"były",
"bedzie",
"będzie",
"beda",
"będą",
"cali",
"cala",
"cała",
"caly",
"cały",
"ci",
"cie",
"cię",
"ciebie",
"co",
"cokolwiek",
"cos",
"coś",
"czasami",
"czasem",
"czemu",
"czy",
"czyli",
"daleko",
"dla",
"dlaczego",
"dlatego",
"do",
"dobrze",
"dokad",
"dokąd",
"dosc",
"dość",
"duzo",
"dużo",
"dwa",
"dwaj",
"dwie",
"dwoje",
"dzis",
"dziś",
"dzisiaj",
"gdy",
"gdyby",
"gdyz",
"gdyż",
"gdzie",
"gdziekolwiek",
"gdzies",
"gdzieś",
"go",
"i",
"ich",
"ile",
"im",
"inna",
"inne",
"inny",
"innych",
"iz",
"iż",
"ja",
"ją",
"jak",
"jakas",
"jakaś",
"jakby",
"jaki",
"jakichs",
"jakichś",
"jakie",
"jakis",
"jakiś",
"jakiz",
"jakiż",
"jakkolwiek",
"jako",
"jakos",
"jakoś",
"je",
"jeden",
"jedna",
"jedno",
"jednak",
"jednakze",
"jednakże",
"jego",
"jej",
"jemu",
"jest",
"jestem",
"jeszcze",
"jesli",
"jeśli",
"jezeli",
"jeżeli",
"juz",
"już",
"kazdy",
"każdy",
"kiedy",
"kilka",
"kims",
"kimś",
"kto",
"ktokolwiek",
"ktos",
"ktoś",
"ktora",
"ktore",
"które",
"ktorego",
"ktorej",
"ktory",
"ktorych",
"ktorym",
"ktorzy",
"która",
"którego",
"której",
"który",
"których",
"którym",
"którzy",
"ku",
"lat",
"lecz",
"lub",
"ma",
"mają",
"mało",
"mam",
"mi",
"mimo",
"miedzy",
"między",
"mna",
"mną",
"mnie",
"moga",
"mogą",
"moi",
"moim",
"moja",
"moje",
"moze",
"może",
"mozliwe",
"mozna",
"możliwe",
"można",
"moj",
"mój",
"mu",
"musi",
"my",
"na",
"nad",
"nam",
"nami",
"nas",
"nasi",
"nasz",
"nasza",
"nasze",
"naszego",
"naszych",
"natomiast",
"natychmiast",
"nawet",
"nia",
"nią",
"nic",
"nich",
"nie",
"niech",
"niego",
"niej",
"niemu",
"nigdy",
"nim",
"nimi",
"niz",
"niż",
"no",
"o",
"obok",
"od",
"około",
"on",
"ona",
"one",
"oni",
"ono",
"oraz",
"oto",
"owszem",
"pan",
"pana",
"pani",
"po",
"pod",
"podczas",
"pomimo",
"ponad",
"poniewaz",
"ponieważ",
"powinien",
"powinna",
"powinni",
"powinno",
"poza",
"prawie",
"przeciez",
"przecież",
"przed",
"przede",
"przedtem",
"przez",
"przy",
"roku",
"rowniez",
"również",
"sam",
"sama",
"są",
"sie",
"się",
"skad",
"skąd",
"sobie",
"soba",
"sobą",
"sposob",
"sposób",
"swoje",
"ta",
"tak",
"taka",
"taki",
"takie",
"takze",
"także",
"tam",
"te",
"tego",
"tej",
"ten",
"teraz",
"też",
"to",
"toba",
"tobą",
"tobie",
"totez",
"toteż",
"trzeba",
"tu",
"tutaj",
"twoi",
"twoim",
"twoja",
"twoje",
"twym",
"twoj",
"twój",
"ty",
"tych",
"tylko",
"tym",
"u",
"w",
"wam",
"wami",
"was",
"wasz",
"wasza",
"wasze",
"we",
"według",
"wiele",
"wielu",
"więc",
"więcej",
"wszyscy",
"wszystkich",
"wszystkie",
"wszystkim",
"wszystko",
"wtedy",
"wy",
"wlasnie",
"właśnie",
"z",
"za",
"zapewne",
"zawsze",
"ze",
"znowu",
"znow",
"znów",
"zostal",
"został",
"zaden",
"zadna",
"zadne",
"zadnych",
"ze",
"zeby",
"żaden",
"żadna",
"żadne",
"żadnych",
"że",
"żeby"
    ]
};

},{}],13:[function(require,module,exports){
/**
 * Created by rodrigo on 01/10/15.
 */

//Portuguese (BRAZIL) stopwords
// via https://sites.google.com/site/kevinbouge/stopwords-lists
module.exports = {
    stopwords: [
        "a",
        "à",
        "adeus",
        "agora",
        "aí",
        "ainda",
        "além",
        "algo",
        "algumas",
        "alguns",
        "ali",
        "ano",
        "anos",
        "antes",
        "ao",
        "aos",
        "apenas",
        "apoio",
        "após",
        "aquela",
        "aquelas",
        "aquele",
        "aqueles",
        "aqui",
        "aquilo",
        "área",
        "as",
        "às",
        "assim",
        "até",
        "atrás",
        "através",
        "baixo",
        "bastante",
        "bem",
        "boa",
        "boas",
        "bom",
        "bons",
        "breve",
        "cá",
        "cada",
        "catorze",
        "cedo",
        "cento",
        "certamente",
        "certeza",
        "cima",
        "cinco",
        "coisa",
        "com",
        "como",
        "conselho",
        "contra",
        "custa",
        "da",
        "dá",
        "dão",
        "daquela",
        "daquelas",
        "daquele",
        "daqueles",
        "dar",
        "das",
        "de",
        "debaixo",
        "demais",
        "dentro",
        "depois",
        "desde",
        "dessa",
        "dessas",
        "desse",
        "desses",
        "desta",
        "destas",
        "deste",
        "destes",
        "deve",
        "deverá",
        "dez",
        "dezanove",
        "dezasseis",
        "dezassete",
        "dezoito",
        "dia",
        "diante",
        "diz",
        "dizem",
        "dizer",
        "do",
        "dois",
        "dos",
        "doze",
        "duas",
        "dúvida",
        "e",
        "é",
        "ela",
        "elas",
        "ele",
        "eles",
        "em",
        "embora",
        "entre",
        "era",
        "és",
        "essa",
        "essas",
        "esse",
        "esses",
        "esta",
        "está",
        "estão",
        "estar",
        "estas",
        "estás",
        "estava",
        "este",
        "estes",
        "esteve",
        "estive",
        "estivemos",
        "estiveram",
        "estiveste",
        "estivestes",
        "estou",
        "eu",
        "exemplo",
        "faço",
        "falta",
        "favor",
        "faz",
        "fazeis",
        "fazem",
        "fazemos",
        "fazer",
        "fazes",
        "fez",
        "fim",
        "final",
        "foi",
        "fomos",
        "for",
        "foram",
        "forma",
        "foste",
        "fostes",
        "fui",
        "geral",
        "grande",
        "grandes",
        "grupo",
        "há",
        "hoje",
        "hora",
        "horas",
        "isso",
        "isto",
        "já",
        "lá",
        "lado",
        "local",
        "logo",
        "longe",
        "lugar",
        "maior",
        "maioria",
        "mais",
        "mal",
        "mas",
        "máximo",
        "me",
        "meio",
        "menor",
        "menos",
        "mês",
        "meses",
        "meu",
        "meus",
        "mil",
        "minha",
        "minhas",
        "momento",
        "muito",
        "muitos",
        "na",
        "nada",
        "não",
        "naquela",
        "naquelas",
        "naquele",
        "naqueles",
        "nas",
        "nem",
        "nenhuma",
        "nessa",
        "nessas",
        "nesse",
        "nesses",
        "nesta",
        "nestas",
        "neste",
        "nestes",
        "nível",
        "no",
        "noite",
        "nome",
        "nos",
        "nós",
        "nossa",
        "nossas",
        "nosso",
        "nossos",
        "nova",
        "novas",
        "nove",
        "novo",
        "novos",
        "num",
        "numa",
        "número",
        "nunca",
        "o",
        "obra",
        "obrigada",
        "obrigado",
        "oitava",
        "oitavo",
        "oito",
        "onde",
        "ontem",
        "onze",
        "os",
        "ou",
        "outra",
        "outras",
        "outro",
        "outros",
        "para",
        "parece",
        "parte",
        "partir",
        "paucas",
        "pela",
        "pelas",
        "pelo",
        "pelos",
        "perto",
        "pode",
        "pôde",
        "podem",
        "poder",
        "põe",
        "põem",
        "ponto",
        "pontos",
        "por",
        "porque",
        "porquê",
        "posição",
        "possível",
        "possivelmente",
        "posso",
        "pouca",
        "pouco",
        "poucos",
        "primeira",
        "primeiras",
        "primeiro",
        "primeiros",
        "própria",
        "próprias",
        "próprio",
        "próprios",
        "próxima",
        "próximas",
        "próximo",
        "próximos",
        "puderam",
        "quáis",
        "qual",
        "quando",
        "quanto",
        "quarta",
        "quarto",
        "quatro",
        "que",
        "quê",
        "quem",
        "quer",
        "quereis",
        "querem",
        "queremas",
        "queres",
        "quero",
        "questão",
        "quinta",
        "quinto",
        "quinze",
        "relação",
        "sabe",
        "sabem",
        "são",
        "se",
        "segunda",
        "segundo",
        "sei",
        "seis",
        "sem",
        "sempre",
        "ser",
        "seria",
        "sete",
        "sétima",
        "sétimo",
        "seu",
        "seus",
        "sexta",
        "sexto",
        "sim",
        "sistema",
        "sob",
        "sobre",
        "sois",
        "somos",
        "sou",
        "sua",
        "suas",
        "tal",
        "talvez",
        "também",
        "tanta",
        "tantas",
        "tanto",
        "tão",
        "tarde",
        "te",
        "tem",
        "têm",
        "temos",
        "tendes",
        "tenho",
        "tens",
        "ter",
        "terceira",
        "terceiro",
        "teu",
        "teus",
        "teve",
        "tive",
        "tivemos",
        "tiveram",
        "tiveste",
        "tivestes",
        "toda",
        "todas",
        "todo",
        "todos",
        "trabalho",
        "três",
        "treze",
        "tu",
        "tua",
        "tuas",
        "tudo",
        "um",
        "uma",
        "umas",
        "uns",
        "vai",
        "vais",
        "vão",
        "vários",
        "vem",
        "vêm",
        "vens",
        "ver",
        "vez",
        "vezes",
        "viagem",
        "vindo",
        "vinte",
        "você",
        "vocês",
        "vos",
        "vós",
        "vossa",
        "vossas",
        "vosso",
        "vossos",
        "zero"
    ]
};
},{}],14:[function(require,module,exports){
// credits to: https://raw.githubusercontent.com/stopwords-iso/stopwords-ro/master/stopwords-ro.json
module.exports = {
    stopwords: [
        "a",
        "abia",
        "acea",
        "aceasta",
        "această",
        "aceea",
        "aceeasi",
        "acei",
        "aceia",
        "acel",
        "acela",
        "acelasi",
        "acele",
        "acelea",
        "acest",
        "acesta",
        "aceste",
        "acestea",
        "acestei",
        "acestia",
        "acestui",
        "aceşti",
        "aceştia",
        "acolo",
        "acord",
        "acum",
        "adica",
        "ai",
        "aia",
        "aibă",
        "aici",
        "aiurea",
        "al",
        "ala",
        "alaturi",
        "ale",
        "alea",
        "alt",
        "alta",
        "altceva",
        "altcineva",
        "alte",
        "altfel",
        "alti",
        "altii",
        "altul",
        "am",
        "anume",
        "apoi",
        "ar",
        "are",
        "as",
        "asa",
        "asemenea",
        "asta",
        "astazi",
        "astea",
        "astfel",
        "astăzi",
        "asupra",
        "atare",
        "atat",
        "atata",
        "atatea",
        "atatia",
        "ati",
        "atit",
        "atita",
        "atitea",
        "atitia",
        "atunci",
        "au",
        "avea",
        "avem",
        "aveţi",
        "avut",
        "azi",
        "aş",
        "aşadar",
        "aţi",
        "b",
        "ba",
        "bine",
        "bucur",
        "bună",
        "c",
        "ca",
        "cam",
        "cand",
        "capat",
        "care",
        "careia",
        "carora",
        "caruia",
        "cat",
        "catre",
        "caut",
        "ce",
        "cea",
        "ceea",
        "cei",
        "ceilalti",
        "cel",
        "cele",
        "celor",
        "ceva",
        "chiar",
        "ci",
        "cinci",
        "cind",
        "cine",
        "cineva",
        "cit",
        "cita",
        "cite",
        "citeva",
        "citi",
        "citiva",
        "conform",
        "contra",
        "cu",
        "cui",
        "cum",
        "cumva",
        "curând",
        "curînd",
        "când",
        "cât",
        "câte",
        "câtva",
        "câţi",
        "cînd",
        "cît",
        "cîte",
        "cîtva",
        "cîţi",
        "că",
        "căci",
        "cărei",
        "căror",
        "cărui",
        "către",
        "d",
        "da",
        "daca",
        "dacă",
        "dar",
        "dat",
        "datorită",
        "dată",
        "dau",
        "de",
        "deasupra",
        "deci",
        "decit",
        "degraba",
        "deja",
        "deoarece",
        "departe",
        "desi",
        "despre",
        "deşi",
        "din",
        "dinaintea",
        "dintr",
        "dintr-",
        "dintre",
        "doar",
        "doi",
        "doilea",
        "două",
        "drept",
        "dupa",
        "după",
        "dă",
        "e",
        "ea",
        "ei",
        "el",
        "ele",
        "era",
        "eram",
        "este",
        "eu",
        "exact",
        "eşti",
        "f",
        "face",
        "fara",
        "fata",
        "fel",
        "fi",
        "fie",
        "fiecare",
        "fii",
        "fim",
        "fiu",
        "fiţi",
        "foarte",
        "fost",
        "frumos",
        "fără",
        "g",
        "geaba",
        "graţie",
        "h",
        "halbă",
        "i",
        "ia",
        "iar",
        "ieri",
        "ii",
        "il",
        "imi",
        "in",
        "inainte",
        "inapoi",
        "inca",
        "incit",
        "insa",
        "intr",
        "intre",
        "isi",
        "iti",
        "j",
        "k",
        "l",
        "la",
        "le",
        "li",
        "lor",
        "lui",
        "lângă",
        "lîngă",
        "m",
        "ma",
        "mai",
        "mare",
        "mea",
        "mei",
        "mele",
        "mereu",
        "meu",
        "mi",
        "mie",
        "mine",
        "mod",
        "mult",
        "multa",
        "multe",
        "multi",
        "multă",
        "mulţi",
        "mulţumesc",
        "mâine",
        "mîine",
        "mă",
        "n",
        "ne",
        "nevoie",
        "ni",
        "nici",
        "niciodata",
        "nicăieri",
        "nimeni",
        "nimeri",
        "nimic",
        "niste",
        "nişte",
        "noastre",
        "noastră",
        "noi",
        "noroc",
        "nostri",
        "nostru",
        "nou",
        "noua",
        "nouă",
        "noştri",
        "nu",
        "numai",
        "o",
        "opt",
        "or",
        "ori",
        "oricare",
        "orice",
        "oricine",
        "oricum",
        "oricând",
        "oricât",
        "oricînd",
        "oricît",
        "oriunde",
        "p",
        "pai",
        "parca",
        "patra",
        "patru",
        "patrulea",
        "pe",
        "pentru",
        "peste",
        "pic",
        "pina",
        "plus",
        "poate",
        "pot",
        "prea",
        "prima",
        "primul",
        "prin",
        "printr-",
        "putini",
        "puţin",
        "puţina",
        "puţină",
        "până",
        "pînă",
        "r",
        "rog",
        "s",
        "sa",
        "sa-mi",
        "sa-ti",
        "sai",
        "sale",
        "sau",
        "se",
        "si",
        "sint",
        "sintem",
        "spate",
        "spre",
        "sub",
        "sunt",
        "suntem",
        "sunteţi",
        "sus",
        "sută",
        "sînt",
        "sîntem",
        "sînteţi",
        "să",
        "săi",
        "său",
        "t",
        "ta",
        "tale",
        "te",
        "ti",
        "timp",
        "tine",
        "toata",
        "toate",
        "toată",
        "tocmai",
        "tot",
        "toti",
        "totul",
        "totusi",
        "totuşi",
        "toţi",
        "trei",
        "treia",
        "treilea",
        "tu",
        "tuturor",
        "tăi",
        "tău",
        "u",
        "ul",
        "ului",
        "un",
        "una",
        "unde",
        "undeva",
        "unei",
        "uneia",
        "unele",
        "uneori",
        "unii",
        "unor",
        "unora",
        "unu",
        "unui",
        "unuia",
        "unul",
        "v",
        "va",
        "vi",
        "voastre",
        "voastră",
        "voi",
        "vom",
        "vor",
        "vostru",
        "vouă",
        "voştri",
        "vreme",
        "vreo",
        "vreun",
        "vă",
        "x",
        "z",
        "zece",
        "zero",
        "zi",
        "zice",
        "îi",
        "îl",
        "îmi",
        "împotriva",
        "în",
        "înainte",
        "înaintea",
        "încotro",
        "încât",
        "încît",
        "între",
        "întrucât",
        "întrucît",
        "îţi",
        "ăla",
        "ălea",
        "ăsta",
        "ăstea",
        "ăştia",
        "şapte",
        "şase",
        "şi",
        "ştiu",
        "ţi",
        "ţie"
    ]
};
},{}],15:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// Russian stopwords
// via https://code.google.com/p/stop-words/

module.exports = {
    stopwords: [
        "а",
        "е",
        "и",
        "ж",
        "м",
        "о",
        "на",
        "не",
        "ни",
        "об",
        "но",
        "он",
        "мне",
        "мои",
        "мож",
        "она",
        "они",
        "оно",
        "мной",
        "много",
        "многочисленное",
        "многочисленная",
        "многочисленные",
        "многочисленный",
        "мною",
        "мой",
        "мог",
        "могут",
        "можно",
        "может",
        "можхо",
        "мор",
        "моя",
        "моё",
        "мочь",
        "над",
        "нее",
        "оба",
        "нам",
        "нем",
        "нами",
        "ними",
        "мимо",
        "немного",
        "одной",
        "одного",
        "менее",
        "однажды",
        "однако",
        "меня",
        "нему",
        "меньше",
        "ней",
        "наверху",
        "него",
        "ниже",
        "мало",
        "надо",
        "один",
        "одиннадцать",
        "одиннадцатый",
        "назад",
        "наиболее",
        "недавно",
        "миллионов",
        "недалеко",
        "между",
        "низко",
        "меля",
        "нельзя",
        "нибудь",
        "непрерывно",
        "наконец",
        "никогда",
        "никуда",
        "нас",
        "наш",
        "нет",
        "нею",
        "неё",
        "них",
        "мира",
        "наша",
        "наше",
        "наши",
        "ничего",
        "начала",
        "нередко",
        "несколько",
        "обычно",
        "опять",
        "около",
        "мы",
        "ну",
        "нх",
        "от",
        "отовсюду",
        "особенно",
        "нужно",
        "очень",
        "отсюда",
        "в",
        "во",
        "вон",
        "вниз",
        "внизу",
        "вокруг",
        "вот",
        "восемнадцать",
        "восемнадцатый",
        "восемь",
        "восьмой",
        "вверх",
        "вам",
        "вами",
        "важное",
        "важная",
        "важные",
        "важный",
        "вдали",
        "везде",
        "ведь",
        "вас",
        "ваш",
        "ваша",
        "ваше",
        "ваши",
        "впрочем",
        "весь",
        "вдруг",
        "вы",
        "все",
        "второй",
        "всем",
        "всеми",
        "времени",
        "время",
        "всему",
        "всего",
        "всегда",
        "всех",
        "всею",
        "всю",
        "вся",
        "всё",
        "всюду",
        "г",
        "год",
        "говорил",
        "говорит",
        "года",
        "году",
        "где",
        "да",
        "ее",
        "за",
        "из",
        "ли",
        "же",
        "им",
        "до",
        "по",
        "ими",
        "под",
        "иногда",
        "довольно",
        "именно",
        "долго",
        "позже",
        "более",
        "должно",
        "пожалуйста",
        "значит",
        "иметь",
        "больше",
        "пока",
        "ему",
        "имя",
        "пор",
        "пора",
        "потом",
        "потому",
        "после",
        "почему",
        "почти",
        "посреди",
        "ей",
        "два",
        "две",
        "двенадцать",
        "двенадцатый",
        "двадцать",
        "двадцатый",
        "двух",
        "его",
        "дел",
        "или",
        "без",
        "день",
        "занят",
        "занята",
        "занято",
        "заняты",
        "действительно",
        "давно",
        "девятнадцать",
        "девятнадцатый",
        "девять",
        "девятый",
        "даже",
        "алло",
        "жизнь",
        "далеко",
        "близко",
        "здесь",
        "дальше",
        "для",
        "лет",
        "зато",
        "даром",
        "первый",
        "перед",
        "затем",
        "зачем",
        "лишь",
        "десять",
        "десятый",
        "ею",
        "её",
        "их",
        "бы",
        "еще",
        "при",
        "был",
        "про",
        "процентов",
        "против",
        "просто",
        "бывает",
        "бывь",
        "если",
        "люди",
        "была",
        "были",
        "было",
        "будем",
        "будет",
        "будете",
        "будешь",
        "прекрасно",
        "буду",
        "будь",
        "будто",
        "будут",
        "ещё",
        "пятнадцать",
        "пятнадцатый",
        "друго",
        "другое",
        "другой",
        "другие",
        "другая",
        "других",
        "есть",
        "пять",
        "быть",
        "лучше",
        "пятый",
        "к",
        "ком",
        "конечно",
        "кому",
        "кого",
        "когда",
        "которой",
        "которого",
        "которая",
        "которые",
        "который",
        "которых",
        "кем",
        "каждое",
        "каждая",
        "каждые",
        "каждый",
        "кажется",
        "как",
        "какой",
        "какая",
        "кто",
        "кроме",
        "куда",
        "кругом",
        "с",
        "т",
        "у",
        "я",
        "та",
        "те",
        "уж",
        "со",
        "то",
        "том",
        "снова",
        "тому",
        "совсем",
        "того",
        "тогда",
        "тоже",
        "собой",
        "тобой",
        "собою",
        "тобою",
        "сначала",
        "только",
        "уметь",
        "тот",
        "тою",
        "хорошо",
        "хотеть",
        "хочешь",
        "хоть",
        "хотя",
        "свое",
        "свои",
        "твой",
        "своей",
        "своего",
        "своих",
        "свою",
        "твоя",
        "твоё",
        "раз",
        "уже",
        "сам",
        "там",
        "тем",
        "чем",
        "сама",
        "сами",
        "теми",
        "само",
        "рано",
        "самом",
        "самому",
        "самой",
        "самого",
        "семнадцать",
        "семнадцатый",
        "самим",
        "самими",
        "самих",
        "саму",
        "семь",
        "чему",
        "раньше",
        "сейчас",
        "чего",
        "сегодня",
        "себе",
        "тебе",
        "сеаой",
        "человек",
        "разве",
        "теперь",
        "себя",
        "тебя",
        "седьмой",
        "спасибо",
        "слишком",
        "так",
        "такое",
        "такой",
        "такие",
        "также",
        "такая",
        "сих",
        "тех",
        "чаще",
        "четвертый",
        "через",
        "часто",
        "шестой",
        "шестнадцать",
        "шестнадцатый",
        "шесть",
        "четыре",
        "четырнадцать",
        "четырнадцатый",
        "сколько",
        "сказал",
        "сказала",
        "сказать",
        "ту",
        "ты",
        "три",
        "эта",
        "эти",
        "что",
        "это",
        "чтоб",
        "этом",
        "этому",
        "этой",
        "этого",
        "чтобы",
        "этот",
        "стал",
        "туда",
        "этим",
        "этими",
        "рядом",
        "тринадцать",
        "тринадцатый",
        "этих",
        "третий",
        "тут",
        "эту",
        "суть",
        "чуть",
        "тысяч"
    ]
};

},{}],16:[function(require,module,exports){
/**
 * Created by jan on 9-3-15.
 */
// Swedish stopwords
// http://www.ranks.nl/stopwords/swedish
// https://github.com/AlexGustafsson

module.exports = {
    stopwords: [
        "aderton",
        "adertonde",
        "adjö",
        "aldrig",
        "alla",
        "allas",
        "allt",
        "alltid",
        "alltså",
        "än",
        "andra",
        "andras",
        "annan",
        "annat",
        "ännu",
        "artonde",
        "artonn",
        "åtminstone",
        "att",
        "åtta",
        "åttio",
        "åttionde",
        "åttonde",
        "av",
        "även",
        "båda",
        "bådas",
        "bakom",
        "bara",
        "bäst",
        "bättre",
        "behöva",
        "behövas",
        "behövde",
        "behövt",
        "beslut",
        "beslutat",
        "beslutit",
        "bland",
        "blev",
        "bli",
        "blir",
        "blivit",
        "bort",
        "borta",
        "bra",
        "då",
        "dag",
        "dagar",
        "dagarna",
        "dagen",
        "där",
        "därför",
        "de",
        "del",
        "delen",
        "dem",
        "den",
        "deras",
        "dess",
        "det",
        "detta",
        "dig",
        "din",
        "dina",
        "dit",
        "ditt",
        "dock",
        "du",
        "efter",
        "eftersom",
        "elfte",
        "eller",
        "elva",
        "en",
        "enkel",
        "enkelt",
        "enkla",
        "enligt",
        "er",
        "era",
        "ert",
        "ett",
        "ettusen",
        "få",
        "fanns",
        "får",
        "fått",
        "fem",
        "femte",
        "femtio",
        "femtionde",
        "femton",
        "femtonde",
        "fick",
        "fin",
        "finnas",
        "finns",
        "fjärde",
        "fjorton",
        "fjortonde",
        "fler",
        "flera",
        "flesta",
        "följande",
        "för",
        "före",
        "förlåt",
        "förra",
        "första",
        "fram",
        "framför",
        "från",
        "fyra",
        "fyrtio",
        "fyrtionde",
        "gå",
        "gälla",
        "gäller",
        "gällt",
        "går",
        "gärna",
        "gått",
        "genast",
        "genom",
        "gick",
        "gjorde",
        "gjort",
        "god",
        "goda",
        "godare",
        "godast",
        "gör",
        "göra",
        "gott",
        "ha",
        "hade",
        "haft",
        "han",
        "hans",
        "har",
        "här",
        "heller",
        "hellre",
        "helst",
        "helt",
        "henne",
        "hennes",
        "hit",
        "hög",
        "höger",
        "högre",
        "högst",
        "hon",
        "honom",
        "hundra",
        "hundraen",
        "hundraett",
        "hur",
        "i",
        "ibland",
        "idag",
        "igår",
        "igen",
        "imorgon",
        "in",
        "inför",
        "inga",
        "ingen",
        "ingenting",
        "inget",
        "innan",
        "inne",
        "inom",
        "inte",
        "inuti",
        "ja",
        "jag",
        "jämfört",
        "kan",
        "kanske",
        "knappast",
        "kom",
        "komma",
        "kommer",
        "kommit",
        "kr",
        "kunde",
        "kunna",
        "kunnat",
        "kvar",
        "länge",
        "längre",
        "långsam",
        "långsammare",
        "långsammast",
        "långsamt",
        "längst",
        "långt",
        "lätt",
        "lättare",
        "lättast",
        "legat",
        "ligga",
        "ligger",
        "lika",
        "likställd",
        "likställda",
        "lilla",
        "lite",
        "liten",
        "litet",
        "man",
        "många",
        "måste",
        "med",
        "mellan",
        "men",
        "mer",
        "mera",
        "mest",
        "mig",
        "min",
        "mina",
        "mindre",
        "minst",
        "mitt",
        "mittemot",
        "möjlig",
        "möjligen",
        "möjligt",
        "möjligtvis",
        "mot",
        "mycket",
        "någon",
        "någonting",
        "något",
        "några",
        "när",
        "nästa",
        "ned",
        "nederst",
        "nedersta",
        "nedre",
        "nej",
        "ner",
        "ni",
        "nio",
        "nionde",
        "nittio",
        "nittionde",
        "nitton",
        "nittonde",
        "nödvändig",
        "nödvändiga",
        "nödvändigt",
        "nödvändigtvis",
        "nog",
        "noll",
        "nr",
        "nu",
        "nummer",
        "och",
        "också",
        "ofta",
        "oftast",
        "olika",
        "olikt",
        "om",
        "oss",
        "över",
        "övermorgon",
        "överst",
        "övre",
        "på",
        "rakt",
        "rätt",
        "redan",
        "redigera",
        "så",
        "sade",
        "säga",
        "säger",
        "sagt",
        "samma",
        "sämre",
        "sämst",
        "se",
        "sedan",
        "senare",
        "senast",
        "sent",
        "sex",
        "sextio",
        "sextionde",
        "sexton",
        "sextonde",
        "sig",
        "sin",
        "sina",
        "sist",
        "sista",
        "siste",
        "sitt",
        "sjätte",
        "sju",
        "sjunde",
        "sjuttio",
        "sjuttionde",
        "sjutton",
        "sjuttonde",
        "ska",
        "skall",
        "skulle",
        "slutligen",
        "små",
        "smått",
        "snart",
        "som",
        "stor",
        "stora",
        "större",
        "störst",
        "stort",
        "tack",
        "tidig",
        "tidigare",
        "tidigast",
        "tidigt",
        "till",
        "tills",
        "tillsammans",
        "tio",
        "tionde",
        "tjugo",
        "tjugoen",
        "tjugoett",
        "tjugonde",
        "tjugotre",
        "tjugotvå",
        "tjungo",
        "tolfte",
        "tolv",
        "tre",
        "tredje",
        "trettio",
        "trettionde",
        "tretton",
        "trettonde",
        "två",
        "tvåhundra",
        "under",
        "upp",
        "ur",
        "ursäkt",
        "ut",
        "utan",
        "utanför",
        "ute",
        "vad",
        "vänster",
        "vänstra",
        "vår",
        "vara",
        "våra",
        "varför",
        "varifrån",
        "varit",
        "varken",
        "värre",
        "varsågod",
        "vart",
        "vårt",
        "vem",
        "vems",
        "verkligen",
        "vi",
        "vid",
        "vidare",
        "viktig",
        "viktigare",
        "viktigast",
        "viktigt",
        "vilka",
        "vilken",
        "vilket",
        "vill",
        "är",
        "år",

        "även",
        "dessa",
        "wikitext",
        "wikipedia",
        "tyngre",
        "tung",
        "tyngst",
        "kall",
        "var",
        "minimum",
        "min",
        "max",
        "maximum",
        "ökning",
        "öka",
        "kallar",
        "hjälp",
        "använder",
        "betydligt",
        "sätt",
        "denna",
        "detta",
        "det",
        "hjälpa",
        "används",
        "består",
        "tränger",
        "igenom",
        "denna",
        "utöka",
        "utarmat",
        "ungefär",
        "sprids",
        "betydligt",
        "omgivande",
        "via",
        "huvudartikel",
        "exempel",
        "exempelvis",
        "vanligt",
        "per",
        "största",
        "stor",
        "ord",
        "ordet",
        "kallas",
        "påbörjad",
        "höra",
        "främst",
        "ihop",
        "antalet",
        "the",
        "uttryck",
        "uttrycket",
        "ändra",
        "presenteras",
        "presenterades",
        "tänka",
        "delar",
        "söka",
        "hämta",
        "innehåll",
        "definera",
        "använda",
        "pekar",
        "istället",
        "stället",
        "pekar",
        "standard",
        "vanligaste",
        "heter",
        "precist",
        "felaktigt",
        "källor",
        "höga",
        "mottagare",
        "eng",
        "bildade",
        "bytte",
        "bildades",
        "grundades",
        "svar",
        "betyder",
        "betydelse",
        "möjligheter",
        "möjlig",
        "möjlighet",
        "syfte",
        "gamla",
        "tioårig",
        "år",
        "övergångsperiod",
        "ersättas",
        "användes",
        "används",
        "utgörs",
        "drygt",
        "alla",
        "allt",
        "alltså",
        "andra",
        "att",
        "bara",
        "bli",
        "blir",
        "borde",
        "bra",
        "mitt",
        "ser",
        "dem",
        "den",
        "denna",
        "det",
        "detta",
        "dig",
        "din",
        "dock",
        "dom",
        "där",
        "edit",
        "efter",
        "eftersom",
        "eller",
        "ett",
        "fast",
        "fel",
        "fick",
        "finns",
        "fram",
        "från",
        "får",
        "fått",
        "för",
        "första",
        "genom",
        "ger",
        "går",
        "gör",
        "göra",
        "hade",
        "han",
        "har",
        "hela",
        "helt",
        "honom",
        "hur",
        "här",
        "iaf",
        "igen",
        "ingen",
        "inget",
        "inte",
        "jag",
        "kan",
        "kanske",
        "kommer",
        "lika",
        "lite",
        "man",
        "med",
        "men",
        "mer",
        "mig",
        "min",
        "mot",
        "mycket",
        "många",
        "måste",
        "nog",
        "när",
        "någon",
        "något",
        "några",
        "nån",
        "nåt",
        "och",
        "också",
        "rätt",
        "samma",
        "sedan",
        "sen",
        "sig",
        "sin",
        "själv",
        "ska",
        "skulle",
        "som",
        "sätt",
        "tar",
        "till",
        "tror",
        "tycker",
        "typ",
        "upp",
        "utan",
        "vad",
        "var",
        "vara",
        "vet",
        "vid",
        "vilket",
        "vill",
        "väl",
        "även",
        "över",
        "förekommer",
        "varierar",
        "representera",
        "representerar",
        "itu",
        "påbörjades",
        "le",
        "åtgärder",
        "åtgärd",
        "sådant",
        "särskilt",
        "eftersom",
        "som",
        "efter",
        "syftet",
        "syfte",
        "ersatts",
        "ersätts",
        "ersatt",
        "ersätt",
        "tagits",
        "byter",
        "benämningar",
        "ler",
        "ärvs",
        "ärv",
        "ärvd",
        "januari",
        "februari",
        "mars",
        "april",
        "maj",
        "juni",
        "juli",
        "augusti",
        "september",
        "oktober",
        "november",
        "december",
        "on",
        "övriga",
        "använts",
        "använd",
        "används",
        "använt",
        "syftar",
        "ex",
        "svårt",
        "svår",
        "lätt",
        "lätta",
        "lättast",
        "lättare",
        "svårare",
        "svårast",
        "list",
        "användningsområde",
        "användningsområden",
        "vissa",
        "ii",
        "hembyggda",
        "krav",
        "lugnt",
        "ändå",
        "stycken",
        "styck",
        "långa",
        "korta",
        "små",
        "stora",
        "smala",
        "tjocka",
        "början",
        "tungt",
        "lätt",
        "tim",
        "st",
        "kg",
        "km",
        "tid",
        "ny",
        "gammal",
        "nyare",
        "antal",
        "snabbare",
        "började",
        "ansvar",
        "ansvarar",
        "både",
        "ca",
        "låg",
        "hög",
        "ro",
        "ton",
        "kap",
        "of",
        "and",
        "vars",
        "kr/km",
        "rör",
        "gällande",
        "placeras",
        "placerades",
        "täckt",
        "samt",
        "hos",
        "sådana",
        "endast",
        "tillstånd",
        "beror",
        "på",
        "marken",
        "minska",
        "orsaker",
        "lösningar",
        "problem",
        "namn",
        "förväntas",
        "förväntan",
        "förväntats",
        "varning",
        "utfärdas",
        "utfärda",
        "km/h",
        "nådde",
        "stod",
        "området",
        "områden",
        "källa",
        "behövs",
        "drabbade",
        "drabbat",
        "which",
        "top",
        "that",
        "lägre",
        "allmänt",
        "drog",
        "drar",
        "enorma",
        "ända",
        "enda",
        "officiella",
        "bekräftats",
        "bekräftas",
        "fall",
        "sjunker",
        "nedåt",
        "värms",
        "samtidigt",
        "efterföljd",
        "problematik",
        "uppåt",
        "utom",
        "förutom",
        "hörnet",
        "söt",
        "salt",
        "svag",
        "stark",
        "ren",
        "smutsig",
        "förr",
        "tiden",
        "mångdag",
        "tisdag",
        "onsdag",
        "torsdag",
        "fredag",
        "lördag",
        "söndag",
        "måndagar",
        "tisdagar",
        "onsdagar",
        "torsdagar",
        "fredagar",
        "lördagar",
        "söndagar",
        "efterlikna",
        "som",
        "lik",
        "bergis",
        "bekymmer",
        "så",
        "lista",
        "dig",
        "dej",
        "mig",
        "mej",
        "fri",
        "vanlig",
        "ovanlig",
        "sällan",
        "ofta",
        "avskiljs",
        "use",
        "släkte",
        "släktet",
        "släkt",
        "kategori",
        "kategoriseras",
        "rensas",
        "renas",
        "timmar",
        "minuter",
        "sekunder"
    ]
};

},{}],17:[function(require,module,exports){
module.exports = {
	danish: require("./da").stopwords,
	dutch: require("./nl").stopwords,
	english: require("./en").stopwords,
	french: require("./fr").stopwords,
	galician: require("./gl").stopwords,
	german: require("./de").stopwords,
	italian: require("./it").stopwords,
	polish: require("./pl").stopwords,
	portuguese: require("./pt").stopwords,
	romanian: require("./ro").stopwords,
	russian: require("./ru").stopwords,
	spanish: require("./es").stopwords,
	swedish: require("./se").stopwords
};

},{"./da":4,"./de":5,"./en":6,"./es":7,"./fr":8,"./gl":9,"./it":10,"./nl":11,"./pl":12,"./pt":13,"./ro":14,"./ru":15,"./se":16}],18:[function(require,module,exports){
/* global window, exports, define */

!function() {
    'use strict'

    var re = {
        not_string: /[^s]/,
        not_bool: /[^t]/,
        not_type: /[^T]/,
        not_primitive: /[^v]/,
        number: /[diefg]/,
        numeric_arg: /[bcdiefguxX]/,
        json: /[j]/,
        not_json: /[^j]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[+-]/
    }

    function sprintf(key) {
        // `arguments` is not an array, but should be fine for this call
        return sprintf_format(sprintf_parse(key), arguments)
    }

    function vsprintf(fmt, argv) {
        return sprintf.apply(null, [fmt].concat(argv || []))
    }

    function sprintf_format(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, arg, output = '', i, k, ph, pad, pad_character, pad_length, is_positive, sign
        for (i = 0; i < tree_length; i++) {
            if (typeof parse_tree[i] === 'string') {
                output += parse_tree[i]
            }
            else if (typeof parse_tree[i] === 'object') {
                ph = parse_tree[i] // convenience purposes only
                if (ph.keys) { // keyword argument
                    arg = argv[cursor]
                    for (k = 0; k < ph.keys.length; k++) {
                        if (arg == undefined) {
                            throw new Error(sprintf('[sprintf] Cannot access property "%s" of undefined value "%s"', ph.keys[k], ph.keys[k-1]))
                        }
                        arg = arg[ph.keys[k]]
                    }
                }
                else if (ph.param_no) { // positional argument (explicit)
                    arg = argv[ph.param_no]
                }
                else { // positional argument (implicit)
                    arg = argv[cursor++]
                }

                if (re.not_type.test(ph.type) && re.not_primitive.test(ph.type) && arg instanceof Function) {
                    arg = arg()
                }

                if (re.numeric_arg.test(ph.type) && (typeof arg !== 'number' && isNaN(arg))) {
                    throw new TypeError(sprintf('[sprintf] expecting number but found %T', arg))
                }

                if (re.number.test(ph.type)) {
                    is_positive = arg >= 0
                }

                switch (ph.type) {
                    case 'b':
                        arg = parseInt(arg, 10).toString(2)
                        break
                    case 'c':
                        arg = String.fromCharCode(parseInt(arg, 10))
                        break
                    case 'd':
                    case 'i':
                        arg = parseInt(arg, 10)
                        break
                    case 'j':
                        arg = JSON.stringify(arg, null, ph.width ? parseInt(ph.width) : 0)
                        break
                    case 'e':
                        arg = ph.precision ? parseFloat(arg).toExponential(ph.precision) : parseFloat(arg).toExponential()
                        break
                    case 'f':
                        arg = ph.precision ? parseFloat(arg).toFixed(ph.precision) : parseFloat(arg)
                        break
                    case 'g':
                        arg = ph.precision ? String(Number(arg.toPrecision(ph.precision))) : parseFloat(arg)
                        break
                    case 'o':
                        arg = (parseInt(arg, 10) >>> 0).toString(8)
                        break
                    case 's':
                        arg = String(arg)
                        arg = (ph.precision ? arg.substring(0, ph.precision) : arg)
                        break
                    case 't':
                        arg = String(!!arg)
                        arg = (ph.precision ? arg.substring(0, ph.precision) : arg)
                        break
                    case 'T':
                        arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase()
                        arg = (ph.precision ? arg.substring(0, ph.precision) : arg)
                        break
                    case 'u':
                        arg = parseInt(arg, 10) >>> 0
                        break
                    case 'v':
                        arg = arg.valueOf()
                        arg = (ph.precision ? arg.substring(0, ph.precision) : arg)
                        break
                    case 'x':
                        arg = (parseInt(arg, 10) >>> 0).toString(16)
                        break
                    case 'X':
                        arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase()
                        break
                }
                if (re.json.test(ph.type)) {
                    output += arg
                }
                else {
                    if (re.number.test(ph.type) && (!is_positive || ph.sign)) {
                        sign = is_positive ? '+' : '-'
                        arg = arg.toString().replace(re.sign, '')
                    }
                    else {
                        sign = ''
                    }
                    pad_character = ph.pad_char ? ph.pad_char === '0' ? '0' : ph.pad_char.charAt(1) : ' '
                    pad_length = ph.width - (sign + arg).length
                    pad = ph.width ? (pad_length > 0 ? pad_character.repeat(pad_length) : '') : ''
                    output += ph.align ? sign + arg + pad : (pad_character === '0' ? sign + pad + arg : pad + sign + arg)
                }
            }
        }
        return output
    }

    var sprintf_cache = Object.create(null)

    function sprintf_parse(fmt) {
        if (sprintf_cache[fmt]) {
            return sprintf_cache[fmt]
        }

        var _fmt = fmt, match, parse_tree = [], arg_names = 0
        while (_fmt) {
            if ((match = re.text.exec(_fmt)) !== null) {
                parse_tree.push(match[0])
            }
            else if ((match = re.modulo.exec(_fmt)) !== null) {
                parse_tree.push('%')
            }
            else if ((match = re.placeholder.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1
                    var field_list = [], replacement_field = match[2], field_match = []
                    if ((field_match = re.key.exec(replacement_field)) !== null) {
                        field_list.push(field_match[1])
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1])
                            }
                            else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1])
                            }
                            else {
                                throw new SyntaxError('[sprintf] failed to parse named argument key')
                            }
                        }
                    }
                    else {
                        throw new SyntaxError('[sprintf] failed to parse named argument key')
                    }
                    match[2] = field_list
                }
                else {
                    arg_names |= 2
                }
                if (arg_names === 3) {
                    throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported')
                }

                parse_tree.push(
                    {
                        placeholder: match[0],
                        param_no:    match[1],
                        keys:        match[2],
                        sign:        match[3],
                        pad_char:    match[4],
                        align:       match[5],
                        width:       match[6],
                        precision:   match[7],
                        type:        match[8]
                    }
                )
            }
            else {
                throw new SyntaxError('[sprintf] unexpected placeholder')
            }
            _fmt = _fmt.substring(match[0].length)
        }
        return sprintf_cache[fmt] = parse_tree
    }

    /**
     * export to either browser or node.js
     */
    /* eslint-disable quote-props */
    if (typeof exports !== 'undefined') {
        exports['sprintf'] = sprintf
        exports['vsprintf'] = vsprintf
    }
    if (typeof window !== 'undefined') {
        window['sprintf'] = sprintf
        window['vsprintf'] = vsprintf

        if (typeof define === 'function' && define['amd']) {
            define(function() {
                return {
                    'sprintf': sprintf,
                    'vsprintf': vsprintf
                }
            })
        }
    }
    /* eslint-enable quote-props */
}(); // eslint-disable-line

},{}],19:[function(require,module,exports){
var trim = require('./trim');
var decap = require('./decapitalize');

module.exports = function camelize(str, decapitalize) {
  str = trim(str).replace(/[-_\s]+(.)?/g, function(match, c) {
    return c ? c.toUpperCase() : '';
  });

  if (decapitalize === true) {
    return decap(str);
  } else {
    return str;
  }
};

},{"./decapitalize":28,"./trim":81}],20:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function capitalize(str, lowercaseRest) {
  str = makeString(str);
  var remainingChars = !lowercaseRest ? str.slice(1) : str.slice(1).toLowerCase();

  return str.charAt(0).toUpperCase() + remainingChars;
};

},{"./helper/makeString":38}],21:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function chars(str) {
  return makeString(str).split('');
};

},{"./helper/makeString":38}],22:[function(require,module,exports){
module.exports = function chop(str, step) {
  if (str == null) return [];
  str = String(str);
  step = ~~step;
  return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
};

},{}],23:[function(require,module,exports){
var capitalize = require('./capitalize');
var camelize = require('./camelize');
var makeString = require('./helper/makeString');

module.exports = function classify(str) {
  str = makeString(str);
  return capitalize(camelize(str.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
};

},{"./camelize":19,"./capitalize":20,"./helper/makeString":38}],24:[function(require,module,exports){
var trim = require('./trim');

module.exports = function clean(str) {
  return trim(str).replace(/\s\s+/g, ' ');
};

},{"./trim":81}],25:[function(require,module,exports){

var makeString = require('./helper/makeString');

var from  = 'ąàáäâãåæăćčĉęèéëêĝĥìíïîĵłľńňòóöőôõðøśșşšŝťțţŭùúüűûñÿýçżźž',
  to    = 'aaaaaaaaaccceeeeeghiiiijllnnoooooooossssstttuuuuuunyyczzz';

from += from.toUpperCase();
to += to.toUpperCase();

to = to.split('');

// for tokens requireing multitoken output
from += 'ß';
to.push('ss');


module.exports = function cleanDiacritics(str) {
  return makeString(str).replace(/.{1}/g, function(c){
    var index = from.indexOf(c);
    return index === -1 ? c : to[index];
  });
};

},{"./helper/makeString":38}],26:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function(str, substr) {
  str = makeString(str);
  substr = makeString(substr);

  if (str.length === 0 || substr.length === 0) return 0;
  
  return str.split(substr).length - 1;
};

},{"./helper/makeString":38}],27:[function(require,module,exports){
var trim = require('./trim');

module.exports = function dasherize(str) {
  return trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
};

},{"./trim":81}],28:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function decapitalize(str) {
  str = makeString(str);
  return str.charAt(0).toLowerCase() + str.slice(1);
};

},{"./helper/makeString":38}],29:[function(require,module,exports){
var makeString = require('./helper/makeString');

function getIndent(str) {
  var matches = str.match(/^[\s\\t]*/gm);
  var indent = matches[0].length;
  
  for (var i = 1; i < matches.length; i++) {
    indent = Math.min(matches[i].length, indent);
  }

  return indent;
}

module.exports = function dedent(str, pattern) {
  str = makeString(str);
  var indent = getIndent(str);
  var reg;

  if (indent === 0) return str;

  if (typeof pattern === 'string') {
    reg = new RegExp('^' + pattern, 'gm');
  } else {
    reg = new RegExp('^[ \\t]{' + indent + '}', 'gm');
  }

  return str.replace(reg, '');
};

},{"./helper/makeString":38}],30:[function(require,module,exports){
var makeString = require('./helper/makeString');
var toPositive = require('./helper/toPositive');

module.exports = function endsWith(str, ends, position) {
  str = makeString(str);
  ends = '' + ends;
  if (typeof position == 'undefined') {
    position = str.length - ends.length;
  } else {
    position = Math.min(toPositive(position), str.length) - ends.length;
  }
  return position >= 0 && str.indexOf(ends, position) === position;
};

},{"./helper/makeString":38,"./helper/toPositive":40}],31:[function(require,module,exports){
var makeString = require('./helper/makeString');
var escapeChars = require('./helper/escapeChars');

var regexString = '[';
for(var key in escapeChars) {
  regexString += key;
}
regexString += ']';

var regex = new RegExp( regexString, 'g');

module.exports = function escapeHTML(str) {

  return makeString(str).replace(regex, function(m) {
    return '&' + escapeChars[m] + ';';
  });
};

},{"./helper/escapeChars":35,"./helper/makeString":38}],32:[function(require,module,exports){
module.exports = function() {
  var result = {};

  for (var prop in this) {
    if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse|join|map|wrap)$/)) continue;
    result[prop] = this[prop];
  }

  return result;
};

},{}],33:[function(require,module,exports){
var makeString = require('./makeString');

module.exports = function adjacent(str, direction) {
  str = makeString(str);
  if (str.length === 0) {
    return '';
  }
  return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length - 1) + direction);
};

},{"./makeString":38}],34:[function(require,module,exports){
var escapeRegExp = require('./escapeRegExp');

module.exports = function defaultToWhiteSpace(characters) {
  if (characters == null)
    return '\\s';
  else if (characters.source)
    return characters.source;
  else
    return '[' + escapeRegExp(characters) + ']';
};

},{"./escapeRegExp":36}],35:[function(require,module,exports){
/* We're explicitly defining the list of entities we want to escape.
nbsp is an HTML entity, but we don't want to escape all space characters in a string, hence its omission in this map.

*/
var escapeChars = {
  '¢' : 'cent',
  '£' : 'pound',
  '¥' : 'yen',
  '€': 'euro',
  '©' :'copy',
  '®' : 'reg',
  '<' : 'lt',
  '>' : 'gt',
  '"' : 'quot',
  '&' : 'amp',
  '\'' : '#39'
};

module.exports = escapeChars;

},{}],36:[function(require,module,exports){
var makeString = require('./makeString');

module.exports = function escapeRegExp(str) {
  return makeString(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

},{"./makeString":38}],37:[function(require,module,exports){
/*
We're explicitly defining the list of entities that might see in escape HTML strings
*/
var htmlEntities = {
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
};

module.exports = htmlEntities;

},{}],38:[function(require,module,exports){
/**
 * Ensure some object is a coerced to a string
 **/
module.exports = function makeString(object) {
  if (object == null) return '';
  return '' + object;
};

},{}],39:[function(require,module,exports){
module.exports = function strRepeat(str, qty){
  if (qty < 1) return '';
  var result = '';
  while (qty > 0) {
    if (qty & 1) result += str;
    qty >>= 1, str += str;
  }
  return result;
};

},{}],40:[function(require,module,exports){
module.exports = function toPositive(number) {
  return number < 0 ? 0 : (+number || 0);
};

},{}],41:[function(require,module,exports){
var capitalize = require('./capitalize');
var underscored = require('./underscored');
var trim = require('./trim');

module.exports = function humanize(str) {
  return capitalize(trim(underscored(str).replace(/_id$/, '').replace(/_/g, ' ')));
};

},{"./capitalize":20,"./trim":81,"./underscored":83}],42:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function include(str, needle) {
  if (needle === '') return true;
  return makeString(str).indexOf(needle) !== -1;
};

},{"./helper/makeString":38}],43:[function(require,module,exports){
/*
* Underscore.string
* (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
* Underscore.string is freely distributable under the terms of the MIT license.
* Documentation: https://github.com/epeli/underscore.string
* Some code is borrowed from MooTools and Alexandru Marasteanu.
* Version '3.3.4'
* @preserve
*/

'use strict';

function s(value) {
  /* jshint validthis: true */
  if (!(this instanceof s)) return new s(value);
  this._wrapped = value;
}

s.VERSION = '3.3.4';

s.isBlank          = require('./isBlank');
s.stripTags        = require('./stripTags');
s.capitalize       = require('./capitalize');
s.decapitalize     = require('./decapitalize');
s.chop             = require('./chop');
s.trim             = require('./trim');
s.clean            = require('./clean');
s.cleanDiacritics  = require('./cleanDiacritics');
s.count            = require('./count');
s.chars            = require('./chars');
s.swapCase         = require('./swapCase');
s.escapeHTML       = require('./escapeHTML');
s.unescapeHTML     = require('./unescapeHTML');
s.splice           = require('./splice');
s.insert           = require('./insert');
s.replaceAll       = require('./replaceAll');
s.include          = require('./include');
s.join             = require('./join');
s.lines            = require('./lines');
s.dedent           = require('./dedent');
s.reverse          = require('./reverse');
s.startsWith       = require('./startsWith');
s.endsWith         = require('./endsWith');
s.pred             = require('./pred');
s.succ             = require('./succ');
s.titleize         = require('./titleize');
s.camelize         = require('./camelize');
s.underscored      = require('./underscored');
s.dasherize        = require('./dasherize');
s.classify         = require('./classify');
s.humanize         = require('./humanize');
s.ltrim            = require('./ltrim');
s.rtrim            = require('./rtrim');
s.truncate         = require('./truncate');
s.prune            = require('./prune');
s.words            = require('./words');
s.pad              = require('./pad');
s.lpad             = require('./lpad');
s.rpad             = require('./rpad');
s.lrpad            = require('./lrpad');
s.sprintf          = require('./sprintf');
s.vsprintf         = require('./vsprintf');
s.toNumber         = require('./toNumber');
s.numberFormat     = require('./numberFormat');
s.strRight         = require('./strRight');
s.strRightBack     = require('./strRightBack');
s.strLeft          = require('./strLeft');
s.strLeftBack      = require('./strLeftBack');
s.toSentence       = require('./toSentence');
s.toSentenceSerial = require('./toSentenceSerial');
s.slugify          = require('./slugify');
s.surround         = require('./surround');
s.quote            = require('./quote');
s.unquote          = require('./unquote');
s.repeat           = require('./repeat');
s.naturalCmp       = require('./naturalCmp');
s.levenshtein      = require('./levenshtein');
s.toBoolean        = require('./toBoolean');
s.exports          = require('./exports');
s.escapeRegExp     = require('./helper/escapeRegExp');
s.wrap             = require('./wrap');
s.map              = require('./map');

// Aliases
s.strip     = s.trim;
s.lstrip    = s.ltrim;
s.rstrip    = s.rtrim;
s.center    = s.lrpad;
s.rjust     = s.lpad;
s.ljust     = s.rpad;
s.contains  = s.include;
s.q         = s.quote;
s.toBool    = s.toBoolean;
s.camelcase = s.camelize;
s.mapChars  = s.map;


// Implement chaining
s.prototype = {
  value: function value() {
    return this._wrapped;
  }
};

function fn2method(key, fn) {
  if (typeof fn !== 'function') return;
  s.prototype[key] = function() {
    var args = [this._wrapped].concat(Array.prototype.slice.call(arguments));
    var res = fn.apply(null, args);
    // if the result is non-string stop the chain and return the value
    return typeof res === 'string' ? new s(res) : res;
  };
}

// Copy functions to instance methods for chaining
for (var key in s) fn2method(key, s[key]);

fn2method('tap', function tap(string, fn) {
  return fn(string);
});

function prototype2method(methodName) {
  fn2method(methodName, function(context) {
    var args = Array.prototype.slice.call(arguments, 1);
    return String.prototype[methodName].apply(context, args);
  });
}

var prototypeMethods = [
  'toUpperCase',
  'toLowerCase',
  'split',
  'replace',
  'slice',
  'substring',
  'substr',
  'concat'
];

for (var method in prototypeMethods) prototype2method(prototypeMethods[method]);


module.exports = s;

},{"./camelize":19,"./capitalize":20,"./chars":21,"./chop":22,"./classify":23,"./clean":24,"./cleanDiacritics":25,"./count":26,"./dasherize":27,"./decapitalize":28,"./dedent":29,"./endsWith":30,"./escapeHTML":31,"./exports":32,"./helper/escapeRegExp":36,"./humanize":41,"./include":42,"./insert":44,"./isBlank":45,"./join":46,"./levenshtein":47,"./lines":48,"./lpad":49,"./lrpad":50,"./ltrim":51,"./map":52,"./naturalCmp":53,"./numberFormat":54,"./pad":55,"./pred":56,"./prune":57,"./quote":58,"./repeat":59,"./replaceAll":60,"./reverse":61,"./rpad":62,"./rtrim":63,"./slugify":64,"./splice":65,"./sprintf":66,"./startsWith":67,"./strLeft":68,"./strLeftBack":69,"./strRight":70,"./strRightBack":71,"./stripTags":72,"./succ":73,"./surround":74,"./swapCase":75,"./titleize":76,"./toBoolean":77,"./toNumber":78,"./toSentence":79,"./toSentenceSerial":80,"./trim":81,"./truncate":82,"./underscored":83,"./unescapeHTML":84,"./unquote":85,"./vsprintf":86,"./words":87,"./wrap":88}],44:[function(require,module,exports){
var splice = require('./splice');

module.exports = function insert(str, i, substr) {
  return splice(str, i, 0, substr);
};

},{"./splice":65}],45:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function isBlank(str) {
  return (/^\s*$/).test(makeString(str));
};

},{"./helper/makeString":38}],46:[function(require,module,exports){
var makeString = require('./helper/makeString');
var slice = [].slice;

module.exports = function join() {
  var args = slice.call(arguments),
    separator = args.shift();

  return args.join(makeString(separator));
};

},{"./helper/makeString":38}],47:[function(require,module,exports){
var makeString = require('./helper/makeString');

/**
 * Based on the implementation here: https://github.com/hiddentao/fast-levenshtein
 */
module.exports = function levenshtein(str1, str2) {
  'use strict';
  str1 = makeString(str1);
  str2 = makeString(str2);

  // Short cut cases  
  if (str1 === str2) return 0;
  if (!str1 || !str2) return Math.max(str1.length, str2.length);

  // two rows
  var prevRow = new Array(str2.length + 1);

  // initialise previous row
  for (var i = 0; i < prevRow.length; ++i) {
    prevRow[i] = i;
  }

  // calculate current row distance from previous row
  for (i = 0; i < str1.length; ++i) {
    var nextCol = i + 1;

    for (var j = 0; j < str2.length; ++j) {
      var curCol = nextCol;

      // substution
      nextCol = prevRow[j] + ( (str1.charAt(i) === str2.charAt(j)) ? 0 : 1 );
      // insertion
      var tmp = curCol + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      // deletion
      tmp = prevRow[j + 1] + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }

      // copy current col value into previous (in preparation for next iteration)
      prevRow[j] = curCol;
    }

    // copy last col value into previous (in preparation for next iteration)
    prevRow[j] = nextCol;
  }

  return nextCol;
};

},{"./helper/makeString":38}],48:[function(require,module,exports){
module.exports = function lines(str) {
  if (str == null) return [];
  return String(str).split(/\r\n?|\n/);
};

},{}],49:[function(require,module,exports){
var pad = require('./pad');

module.exports = function lpad(str, length, padStr) {
  return pad(str, length, padStr);
};

},{"./pad":55}],50:[function(require,module,exports){
var pad = require('./pad');

module.exports = function lrpad(str, length, padStr) {
  return pad(str, length, padStr, 'both');
};

},{"./pad":55}],51:[function(require,module,exports){
var makeString = require('./helper/makeString');
var defaultToWhiteSpace = require('./helper/defaultToWhiteSpace');
var nativeTrimLeft = String.prototype.trimLeft;

module.exports = function ltrim(str, characters) {
  str = makeString(str);
  if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
  characters = defaultToWhiteSpace(characters);
  return str.replace(new RegExp('^' + characters + '+'), '');
};

},{"./helper/defaultToWhiteSpace":34,"./helper/makeString":38}],52:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function(str, callback) {
  str = makeString(str);

  if (str.length === 0 || typeof callback !== 'function') return str;

  return str.replace(/./g, callback);
};

},{"./helper/makeString":38}],53:[function(require,module,exports){
module.exports = function naturalCmp(str1, str2) {
  if (str1 == str2) return 0;
  if (!str1) return -1;
  if (!str2) return 1;

  var cmpRegex = /(\.\d+|\d+|\D+)/g,
    tokens1 = String(str1).match(cmpRegex),
    tokens2 = String(str2).match(cmpRegex),
    count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i],
      b = tokens2[i];

    if (a !== b) {
      var num1 = +a;
      var num2 = +b;
      if (num1 === num1 && num2 === num2) {
        return num1 > num2 ? 1 : -1;
      }
      return a < b ? -1 : 1;
    }
  }

  if (tokens1.length != tokens2.length)
    return tokens1.length - tokens2.length;

  return str1 < str2 ? -1 : 1;
};

},{}],54:[function(require,module,exports){
module.exports = function numberFormat(number, dec, dsep, tsep) {
  if (isNaN(number) || number == null) return '';

  number = number.toFixed(~~dec);
  tsep = typeof tsep == 'string' ? tsep : ',';

  var parts = number.split('.'),
    fnums = parts[0],
    decimals = parts[1] ? (dsep || '.') + parts[1] : '';

  return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
};

},{}],55:[function(require,module,exports){
var makeString = require('./helper/makeString');
var strRepeat = require('./helper/strRepeat');

module.exports = function pad(str, length, padStr, type) {
  str = makeString(str);
  length = ~~length;

  var padlen = 0;

  if (!padStr)
    padStr = ' ';
  else if (padStr.length > 1)
    padStr = padStr.charAt(0);

  switch (type) {
  case 'right':
    padlen = length - str.length;
    return str + strRepeat(padStr, padlen);
  case 'both':
    padlen = length - str.length;
    return strRepeat(padStr, Math.ceil(padlen / 2)) + str + strRepeat(padStr, Math.floor(padlen / 2));
  default: // 'left'
    padlen = length - str.length;
    return strRepeat(padStr, padlen) + str;
  }
};

},{"./helper/makeString":38,"./helper/strRepeat":39}],56:[function(require,module,exports){
var adjacent = require('./helper/adjacent');

module.exports = function succ(str) {
  return adjacent(str, -1);
};

},{"./helper/adjacent":33}],57:[function(require,module,exports){
/**
 * _s.prune: a more elegant version of truncate
 * prune extra chars, never leaving a half-chopped word.
 * @author github.com/rwz
 */
var makeString = require('./helper/makeString');
var rtrim = require('./rtrim');

module.exports = function prune(str, length, pruneStr) {
  str = makeString(str);
  length = ~~length;
  pruneStr = pruneStr != null ? String(pruneStr) : '...';

  if (str.length <= length) return str;

  var tmpl = function(c) {
      return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' ';
    },
    template = str.slice(0, length + 1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

  if (template.slice(template.length - 2).match(/\w\w/))
    template = template.replace(/\s*\S+$/, '');
  else
    template = rtrim(template.slice(0, template.length - 1));

  return (template + pruneStr).length > str.length ? str : str.slice(0, template.length) + pruneStr;
};

},{"./helper/makeString":38,"./rtrim":63}],58:[function(require,module,exports){
var surround = require('./surround');

module.exports = function quote(str, quoteChar) {
  return surround(str, quoteChar || '"');
};

},{"./surround":74}],59:[function(require,module,exports){
var makeString = require('./helper/makeString');
var strRepeat = require('./helper/strRepeat');

module.exports = function repeat(str, qty, separator) {
  str = makeString(str);

  qty = ~~qty;

  // using faster implementation if separator is not needed;
  if (separator == null) return strRepeat(str, qty);

  // this one is about 300x slower in Google Chrome
  /*eslint no-empty: 0*/
  for (var repeat = []; qty > 0; repeat[--qty] = str) {}
  return repeat.join(separator);
};

},{"./helper/makeString":38,"./helper/strRepeat":39}],60:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function replaceAll(str, find, replace, ignorecase) {
  var flags = (ignorecase === true)?'gi':'g';
  var reg = new RegExp(find, flags);

  return makeString(str).replace(reg, replace);
};

},{"./helper/makeString":38}],61:[function(require,module,exports){
var chars = require('./chars');

module.exports = function reverse(str) {
  return chars(str).reverse().join('');
};

},{"./chars":21}],62:[function(require,module,exports){
var pad = require('./pad');

module.exports = function rpad(str, length, padStr) {
  return pad(str, length, padStr, 'right');
};

},{"./pad":55}],63:[function(require,module,exports){
var makeString = require('./helper/makeString');
var defaultToWhiteSpace = require('./helper/defaultToWhiteSpace');
var nativeTrimRight = String.prototype.trimRight;

module.exports = function rtrim(str, characters) {
  str = makeString(str);
  if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
  characters = defaultToWhiteSpace(characters);
  return str.replace(new RegExp(characters + '+$'), '');
};

},{"./helper/defaultToWhiteSpace":34,"./helper/makeString":38}],64:[function(require,module,exports){
var trim = require('./trim');
var dasherize = require('./dasherize');
var cleanDiacritics = require('./cleanDiacritics');

module.exports = function slugify(str) {
  return trim(dasherize(cleanDiacritics(str).replace(/[^\w\s-]/g, '-').toLowerCase()), '-');
};

},{"./cleanDiacritics":25,"./dasherize":27,"./trim":81}],65:[function(require,module,exports){
var chars = require('./chars');

module.exports = function splice(str, i, howmany, substr) {
  var arr = chars(str);
  arr.splice(~~i, ~~howmany, substr);
  return arr.join('');
};

},{"./chars":21}],66:[function(require,module,exports){
var deprecate = require('util-deprecate');

module.exports = deprecate(require('sprintf-js').sprintf,
  'sprintf() will be removed in the next major release, use the sprintf-js package instead.');

},{"sprintf-js":18,"util-deprecate":90}],67:[function(require,module,exports){
var makeString = require('./helper/makeString');
var toPositive = require('./helper/toPositive');

module.exports = function startsWith(str, starts, position) {
  str = makeString(str);
  starts = '' + starts;
  position = position == null ? 0 : Math.min(toPositive(position), str.length);
  return str.lastIndexOf(starts, position) === position;
};

},{"./helper/makeString":38,"./helper/toPositive":40}],68:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function strLeft(str, sep) {
  str = makeString(str);
  sep = makeString(sep);
  var pos = !sep ? -1 : str.indexOf(sep);
  return~ pos ? str.slice(0, pos) : str;
};

},{"./helper/makeString":38}],69:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function strLeftBack(str, sep) {
  str = makeString(str);
  sep = makeString(sep);
  var pos = str.lastIndexOf(sep);
  return~ pos ? str.slice(0, pos) : str;
};

},{"./helper/makeString":38}],70:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function strRight(str, sep) {
  str = makeString(str);
  sep = makeString(sep);
  var pos = !sep ? -1 : str.indexOf(sep);
  return~ pos ? str.slice(pos + sep.length, str.length) : str;
};

},{"./helper/makeString":38}],71:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function strRightBack(str, sep) {
  str = makeString(str);
  sep = makeString(sep);
  var pos = !sep ? -1 : str.lastIndexOf(sep);
  return~ pos ? str.slice(pos + sep.length, str.length) : str;
};

},{"./helper/makeString":38}],72:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function stripTags(str) {
  return makeString(str).replace(/<\/?[^>]+>/g, '');
};

},{"./helper/makeString":38}],73:[function(require,module,exports){
var adjacent = require('./helper/adjacent');

module.exports = function succ(str) {
  return adjacent(str, 1);
};

},{"./helper/adjacent":33}],74:[function(require,module,exports){
module.exports = function surround(str, wrapper) {
  return [wrapper, str, wrapper].join('');
};

},{}],75:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function swapCase(str) {
  return makeString(str).replace(/\S/g, function(c) {
    return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
  });
};

},{"./helper/makeString":38}],76:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function titleize(str) {
  return makeString(str).toLowerCase().replace(/(?:^|\s|-)\S/g, function(c) {
    return c.toUpperCase();
  });
};

},{"./helper/makeString":38}],77:[function(require,module,exports){
var trim = require('./trim');

function boolMatch(s, matchers) {
  var i, matcher, down = s.toLowerCase();
  matchers = [].concat(matchers);
  for (i = 0; i < matchers.length; i += 1) {
    matcher = matchers[i];
    if (!matcher) continue;
    if (matcher.test && matcher.test(s)) return true;
    if (matcher.toLowerCase() === down) return true;
  }
}

module.exports = function toBoolean(str, trueValues, falseValues) {
  if (typeof str === 'number') str = '' + str;
  if (typeof str !== 'string') return !!str;
  str = trim(str);
  if (boolMatch(str, trueValues || ['true', '1'])) return true;
  if (boolMatch(str, falseValues || ['false', '0'])) return false;
};

},{"./trim":81}],78:[function(require,module,exports){
module.exports = function toNumber(num, precision) {
  if (num == null) return 0;
  var factor = Math.pow(10, isFinite(precision) ? precision : 0);
  return Math.round(num * factor) / factor;
};

},{}],79:[function(require,module,exports){
var rtrim = require('./rtrim');

module.exports = function toSentence(array, separator, lastSeparator, serial) {
  separator = separator || ', ';
  lastSeparator = lastSeparator || ' and ';
  var a = array.slice(),
    lastMember = a.pop();

  if (array.length > 2 && serial) lastSeparator = rtrim(separator) + lastSeparator;

  return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
};

},{"./rtrim":63}],80:[function(require,module,exports){
var toSentence = require('./toSentence');

module.exports = function toSentenceSerial(array, sep, lastSep) {
  return toSentence(array, sep, lastSep, true);
};

},{"./toSentence":79}],81:[function(require,module,exports){
var makeString = require('./helper/makeString');
var defaultToWhiteSpace = require('./helper/defaultToWhiteSpace');
var nativeTrim = String.prototype.trim;

module.exports = function trim(str, characters) {
  str = makeString(str);
  if (!characters && nativeTrim) return nativeTrim.call(str);
  characters = defaultToWhiteSpace(characters);
  return str.replace(new RegExp('^' + characters + '+|' + characters + '+$', 'g'), '');
};

},{"./helper/defaultToWhiteSpace":34,"./helper/makeString":38}],82:[function(require,module,exports){
var makeString = require('./helper/makeString');

module.exports = function truncate(str, length, truncateStr) {
  str = makeString(str);
  truncateStr = truncateStr || '...';
  length = ~~length;
  return str.length > length ? str.slice(0, length) + truncateStr : str;
};

},{"./helper/makeString":38}],83:[function(require,module,exports){
var trim = require('./trim');

module.exports = function underscored(str) {
  return trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
};

},{"./trim":81}],84:[function(require,module,exports){
var makeString = require('./helper/makeString');
var htmlEntities = require('./helper/htmlEntities');

module.exports = function unescapeHTML(str) {
  return makeString(str).replace(/\&([^;]{1,10});/g, function(entity, entityCode) {
    var match;

    if (entityCode in htmlEntities) {
      return htmlEntities[entityCode];
    /*eslint no-cond-assign: 0*/
    } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
      return String.fromCharCode(parseInt(match[1], 16));
    /*eslint no-cond-assign: 0*/
    } else if (match = entityCode.match(/^#(\d+)$/)) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });
};

},{"./helper/htmlEntities":37,"./helper/makeString":38}],85:[function(require,module,exports){
module.exports = function unquote(str, quoteChar) {
  quoteChar = quoteChar || '"';
  if (str[0] === quoteChar && str[str.length - 1] === quoteChar)
    return str.slice(1, str.length - 1);
  else return str;
};

},{}],86:[function(require,module,exports){
var deprecate = require('util-deprecate');

module.exports = deprecate(require('sprintf-js').vsprintf,
  'vsprintf() will be removed in the next major release, use the sprintf-js package instead.');

},{"sprintf-js":18,"util-deprecate":90}],87:[function(require,module,exports){
var isBlank = require('./isBlank');
var trim = require('./trim');

module.exports = function words(str, delimiter) {
  if (isBlank(str)) return [];
  return trim(str, delimiter).split(delimiter || /\s+/);
};

},{"./isBlank":45,"./trim":81}],88:[function(require,module,exports){
// Wrap
// wraps a string by a certain width

var makeString = require('./helper/makeString');

module.exports = function wrap(str, options){
  str = makeString(str);
  
  options = options || {};
  
  var width = options.width || 75;
  var seperator = options.seperator || '\n';
  var cut = options.cut || false;
  var preserveSpaces = options.preserveSpaces || false;
  var trailingSpaces = options.trailingSpaces || false;
  
  var result;
  
  if(width <= 0){
    return str;
  }
  
  else if(!cut){
  
    var words = str.split(' ');
    var current_column = 0;
    result = '';
  
    while(words.length > 0){
      
      // if adding a space and the next word would cause this line to be longer than width...
      if(1 + words[0].length + current_column > width){
        //start a new line if this line is not already empty
        if(current_column > 0){
          // add a space at the end of the line is preserveSpaces is true
          if (preserveSpaces){
            result += ' ';
            current_column++;
          }
          // fill the rest of the line with spaces if trailingSpaces option is true
          else if(trailingSpaces){
            while(current_column < width){
              result += ' ';
              current_column++;
            }            
          }
          //start new line
          result += seperator;
          current_column = 0;
        }
      }
  
      // if not at the begining of the line, add a space in front of the word
      if(current_column > 0){
        result += ' ';
        current_column++;
      }
  
      // tack on the next word, update current column, a pop words array
      result += words[0];
      current_column += words[0].length;
      words.shift();
  
    }
  
    // fill the rest of the line with spaces if trailingSpaces option is true
    if(trailingSpaces){
      while(current_column < width){
        result += ' ';
        current_column++;
      }            
    }
  
    return result;
  
  }
  
  else {
  
    var index = 0;
    result = '';
  
    // walk through each character and add seperators where appropriate
    while(index < str.length){
      if(index % width == 0 && index > 0){
        result += seperator;
      }
      result += str.charAt(index);
      index++;
    }
  
    // fill the rest of the line with spaces if trailingSpaces option is true
    if(trailingSpaces){
      while(index % width > 0){
        result += ' ';
        index++;
      }            
    }
    
    return result;
  }
};

},{"./helper/makeString":38}],89:[function(require,module,exports){
(function (global){(function (){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('underscore', factory) :
  (function() {
  	var current = global._;
  	var exports = factory();
  	global._ = exports;
  	exports.noConflict = function() { global._ = current; return exports; };
  })();
}(this, (function () {

  //     Underscore.js 1.10.2
  //     https://underscorejs.org
  //     (c) 2009-2020 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
  //     Underscore may be freely distributed under the MIT license.

  // Baseline setup
  // --------------

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            Function('return this')() ||
            {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create;

  // Create references to these builtin functions because we override them.
  var _isNaN = root.isNaN,
      _isFinite = root.isFinite;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // The Underscore object. All exported functions below are added to it in the
  // modules/index-all.js using the mixin function.
  function _(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  }

  // Current version.
  var VERSION = _.VERSION = '1.10.2';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  function optimizeCb(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      // The 2-argument case is omitted because we’re not using it.
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  }

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  function baseIteratee(value, context, argCount) {
    if (value == null) return identity;
    if (isFunction(value)) return optimizeCb(value, context, argCount);
    if (isObject(value) && !isArray(value)) return matcher(value);
    return property(value);
  }

  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only argCount argument.
  _.iteratee = iteratee;
  function iteratee(value, context) {
    return baseIteratee(value, context, Infinity);
  }

  // The function we actually call internally. It invokes _.iteratee if
  // overridden, otherwise baseIteratee.
  function cb(value, context, argCount) {
    if (_.iteratee !== iteratee) return _.iteratee(value, context);
    return baseIteratee(value, context, argCount);
  }

  // Some functions take a variable number of arguments, or a few expected
  // arguments at the beginning and then a variable number of values to operate
  // on. This helper accumulates all remaining arguments past the function’s
  // argument length (or an explicit `startIndex`), into an array that becomes
  // the last argument. Similar to ES6’s "rest parameter".
  function restArguments(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  }

  // An internal function for creating a new object that inherits from another.
  function baseCreate(prototype) {
    if (!isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  }

  function shallowProperty(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  }

  function _has(obj, path) {
    return obj != null && hasOwnProperty.call(obj, path);
  }

  function deepGet(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  }

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = shallowProperty('length');
  function isArrayLike(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  }

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  function each(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var _keys = keys(obj);
      for (i = 0, length = _keys.length; i < length; i++) {
        iteratee(obj[_keys[i]], _keys[i], obj);
      }
    }
    return obj;
  }

  // Return the results of applying the iteratee to each element.
  function map(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    var reducer = function(obj, iteratee, memo, initial) {
      var _keys = !isArrayLike(obj) && keys(obj),
          length = (_keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      if (!initial) {
        memo = obj[_keys ? _keys[index] : index];
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = _keys ? _keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    return function(obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  var reduce = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  var reduceRight = createReduce(-1);

  // Return the first value which passes a truth test.
  function find(obj, predicate, context) {
    var keyFinder = isArrayLike(obj) ? findIndex : findKey;
    var key = keyFinder(obj, predicate, context);
    if (key !== void 0 && key !== -1) return obj[key];
  }

  // Return all the elements that pass a truth test.
  function filter(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  }

  // Return all the elements for which a truth test fails.
  function reject(obj, predicate, context) {
    return filter(obj, negate(cb(predicate)), context);
  }

  // Determine whether all of the elements match a truth test.
  function every(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  }

  // Determine if at least one element in the object matches a truth test.
  function some(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  }

  // Determine if the array or object contains a given item (using `===`).
  function contains(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return indexOf(obj, item, fromIndex) >= 0;
  }

  // Invoke a method (with arguments) on every item in a collection.
  var invoke = restArguments(function(obj, path, args) {
    var contextPath, func;
    if (isFunction(path)) {
      func = path;
    } else if (isArray(path)) {
      contextPath = path.slice(0, -1);
      path = path[path.length - 1];
    }
    return map(obj, function(context) {
      var method = func;
      if (!method) {
        if (contextPath && contextPath.length) {
          context = deepGet(context, contextPath);
        }
        if (context == null) return void 0;
        method = context[path];
      }
      return method == null ? method : method.apply(context, args);
    });
  });

  // Convenience version of a common use case of `map`: fetching a property.
  function pluck(obj, key) {
    return map(obj, property(key));
  }

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  function where(obj, attrs) {
    return filter(obj, matcher(attrs));
  }

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  function findWhere(obj, attrs) {
    return find(obj, matcher(attrs));
  }

  // Return the maximum element (or element-based computation).
  function max(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Return the minimum element (or element-based computation).
  function min(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Shuffle a collection.
  function shuffle(obj) {
    return sample(obj, Infinity);
  }

  // Sample **n** random values from a collection using the modern version of the
  // [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  function sample(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = values(obj);
      return obj[random(obj.length - 1)];
    }
    var sample = isArrayLike(obj) ? clone(obj) : values(obj);
    var length = getLength(sample);
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    for (var index = 0; index < n; index++) {
      var rand = random(index, last);
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    return sample.slice(0, n);
  }

  // Sort the object's values by a criterion produced by an iteratee.
  function sortBy(obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    return pluck(map(obj, function(value, key, list) {
      return {
        value: value,
        index: index++,
        criteria: iteratee(value, key, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  }

  // An internal function used for aggregate "group by" operations.
  function group(behavior, partition) {
    return function(obj, iteratee, context) {
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  }

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  var groupBy = group(function(result, value, key) {
    if (_has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  var indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  var countBy = group(function(result, value, key) {
    if (_has(result, key)) result[key]++; else result[key] = 1;
  });

  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
  // Safely create a real, live array from anything iterable.
  function toArray(obj) {
    if (!obj) return [];
    if (isArray(obj)) return slice.call(obj);
    if (isString(obj)) {
      // Keep surrogate pair characters together
      return obj.match(reStrSymbol);
    }
    if (isArrayLike(obj)) return map(obj, identity);
    return values(obj);
  }

  // Return the number of elements in an object.
  function size(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : keys(obj).length;
  }

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  var partition = group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. The **guard** check allows it to work with `map`.
  function first(array, n, guard) {
    if (array == null || array.length < 1) return n == null ? void 0 : [];
    if (n == null || guard) return array[0];
    return initial(array, array.length - n);
  }

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  function initial(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  }

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  function last(array, n, guard) {
    if (array == null || array.length < 1) return n == null ? void 0 : [];
    if (n == null || guard) return array[array.length - 1];
    return rest(array, Math.max(0, array.length - n));
  }

  // Returns everything but the first entry of the array. Especially useful on
  // the arguments object. Passing an **n** will return the rest N values in the
  // array.
  function rest(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  }

  // Trim out all falsy values from an array.
  function compact(array) {
    return filter(array, Boolean);
  }

  // Internal implementation of a recursive `flatten` function.
  function _flatten(input, shallow, strict, output) {
    output = output || [];
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (isArray(value) || isArguments(value))) {
        // Flatten current level of array or arguments object.
        if (shallow) {
          var j = 0, len = value.length;
          while (j < len) output[idx++] = value[j++];
        } else {
          _flatten(value, shallow, strict, output);
          idx = output.length;
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  }

  // Flatten out an array, either recursively (by default), or just one level.
  function flatten(array, shallow) {
    return _flatten(array, shallow, false);
  }

  // Return a version of the array that does not contain the specified value(s).
  var without = restArguments(function(array, otherArrays) {
    return difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // The faster algorithm will not work with an iteratee if the iteratee
  // is not a one-to-one function, so providing an iteratee will disable
  // the faster algorithm.
  function uniq(array, isSorted, iteratee, context) {
    if (!isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted && !iteratee) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  }

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  var union = restArguments(function(arrays) {
    return uniq(_flatten(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  function intersection(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (contains(result, item)) continue;
      var j;
      for (j = 1; j < argsLength; j++) {
        if (!contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  }

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  var difference = restArguments(function(array, rest) {
    rest = _flatten(rest, true, true);
    return filter(array, function(value){
      return !contains(rest, value);
    });
  });

  // Complement of zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  function unzip(array) {
    var length = array && max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = pluck(array, index);
    }
    return result;
  }

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  var zip = restArguments(unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values. Passing by pairs is the reverse of pairs.
  function object(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  }

  // Generator function to create the findIndex and findLastIndex functions.
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test.
  var findIndex = createPredicateIndexFinder(1);
  var findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  function sortedIndex(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  }

  // Generator function to create the indexOf and lastIndexOf functions.
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  var indexOf = createIndexFinder(1, findIndex, sortedIndex);
  var lastIndexOf = createIndexFinder(-1, findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](https://docs.python.org/library/functions.html#range).
  function range(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    if (!step) {
      step = stop < start ? -1 : 1;
    }

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  }

  // Chunk a single array into multiple arrays, each containing `count` or fewer
  // items.
  function chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  }

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments.
  function executeBound(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (isObject(result)) return result;
    return self;
  }

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  var bind = restArguments(function(func, context, args) {
    if (!isFunction(func)) throw new TypeError('Bind must be called on a function');
    var bound = restArguments(function(callArgs) {
      return executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `partial.placeholder` for a custom placeholder argument.
  var partial = restArguments(function(func, boundArgs) {
    var placeholder = partial.placeholder;
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });

  partial.placeholder = _;

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  var bindAll = restArguments(function(obj, _keys) {
    _keys = _flatten(_keys, false, false);
    var index = _keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = _keys[index];
      obj[key] = bind(obj[key], obj);
    }
  });

  // Memoize an expensive function by storing its results.
  function memoize(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  }

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  var delay = restArguments(function(func, wait, args) {
    return setTimeout(function() {
      return func.apply(null, args);
    }, wait);
  });

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  var defer = partial(delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  function throttle(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var _now = now();
      if (!previous && options.leading === false) previous = _now;
      var remaining = wait - (_now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = _now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  }

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  function debounce(func, wait, immediate) {
    var timeout, result;

    var later = function(context, args) {
      timeout = null;
      if (args) result = func.apply(context, args);
    };

    var debounced = restArguments(function(args) {
      if (timeout) clearTimeout(timeout);
      if (immediate) {
        var callNow = !timeout;
        timeout = setTimeout(later, wait);
        if (callNow) result = func.apply(this, args);
      } else {
        timeout = delay(later, wait, this, args);
      }

      return result;
    });

    debounced.cancel = function() {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounced;
  }

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  function wrap(func, wrapper) {
    return partial(wrapper, func);
  }

  // Returns a negated version of the passed-in predicate.
  function negate(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  }

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  function compose() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  }

  // Returns a function that will only be executed on and after the Nth call.
  function after(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  // Returns a function that will only be executed up to (but not including) the Nth call.
  function before(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  }

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  var once = partial(before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
    'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, _keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = isFunction(constructor) && constructor.prototype || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_has(obj, prop) && !contains(_keys, prop)) _keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !contains(_keys, prop)) {
        _keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  function keys(obj) {
    if (!isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var _keys = [];
    for (var key in obj) if (_has(obj, key)) _keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, _keys);
    return _keys;
  }

  // Retrieve all the property names of an object.
  function allKeys(obj) {
    if (!isObject(obj)) return [];
    var _keys = [];
    for (var key in obj) _keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, _keys);
    return _keys;
  }

  // Retrieve the values of an object's properties.
  function values(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[_keys[i]];
    }
    return values;
  }

  // Returns the results of applying the iteratee to each element of the object.
  // In contrast to map it returns an object.
  function mapObject(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = keys(obj),
        length = _keys.length,
        results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = _keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Convert an object into a list of `[key, value]` pairs.
  // The opposite of object.
  function pairs(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [_keys[i], obj[_keys[i]]];
    }
    return pairs;
  }

  // Invert the keys and values of an object. The values must be serializable.
  function invert(obj) {
    var result = {};
    var _keys = keys(obj);
    for (var i = 0, length = _keys.length; i < length; i++) {
      result[obj[_keys[i]]] = _keys[i];
    }
    return result;
  }

  // Return a sorted list of the function names available on the object.
  function functions(obj) {
    var names = [];
    for (var key in obj) {
      if (isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  }

  // An internal function for creating assigner functions.
  function createAssigner(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            _keys = keysFunc(source),
            l = _keys.length;
        for (var i = 0; i < l; i++) {
          var key = _keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  }

  // Extend a given object with all the properties in passed-in object(s).
  var extend = createAssigner(allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  var extendOwn = createAssigner(keys);

  // Returns the first key on an object that passes a predicate test.
  function findKey(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = keys(obj), key;
    for (var i = 0, length = _keys.length; i < length; i++) {
      key = _keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  }

  // Internal pick helper function to determine if `obj` has key `key`.
  function keyInObj(value, key, obj) {
    return key in obj;
  }

  // Return a copy of the object only containing the whitelisted properties.
  var pick = restArguments(function(obj, _keys) {
    var result = {}, iteratee = _keys[0];
    if (obj == null) return result;
    if (isFunction(iteratee)) {
      if (_keys.length > 1) iteratee = optimizeCb(iteratee, _keys[1]);
      _keys = allKeys(obj);
    } else {
      iteratee = keyInObj;
      _keys = _flatten(_keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = _keys.length; i < length; i++) {
      var key = _keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the blacklisted properties.
  var omit = restArguments(function(obj, _keys) {
    var iteratee = _keys[0], context;
    if (isFunction(iteratee)) {
      iteratee = negate(iteratee);
      if (_keys.length > 1) context = _keys[1];
    } else {
      _keys = map(_flatten(_keys, false, false), String);
      iteratee = function(value, key) {
        return !contains(_keys, key);
      };
    }
    return pick(obj, iteratee, context);
  });

  // Fill in a given object with default properties.
  var defaults = createAssigner(allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  function create(prototype, props) {
    var result = baseCreate(prototype);
    if (props) extendOwn(result, props);
    return result;
  }

  // Create a (shallow-cloned) duplicate of an object.
  function clone(obj) {
    if (!isObject(obj)) return obj;
    return isArray(obj) ? obj.slice() : extend({}, obj);
  }

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  function tap(obj, interceptor) {
    interceptor(obj);
    return obj;
  }

  // Returns whether an object has a given set of `key:value` pairs.
  function isMatch(object, attrs) {
    var _keys = keys(attrs), length = _keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = _keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  }


  // Internal recursive comparison function for `isEqual`.
  function eq(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](https://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  }

  // Internal recursive comparison function for `isEqual`.
  function deepEq(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                               isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var _keys = keys(a), key;
      length = _keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = _keys[length];
        if (!(_has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  }

  // Perform a deep comparison to check if two objects are equal.
  function isEqual(a, b) {
    return eq(a, b);
  }

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  function isEmpty(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (isArray(obj) || isString(obj) || isArguments(obj))) return obj.length === 0;
    return keys(obj).length === 0;
  }

  // Is a given value a DOM element?
  function isElement(obj) {
    return !!(obj && obj.nodeType === 1);
  }

  // Internal function for creating a toString-based type tester.
  function tagTester(name) {
    return function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  }

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  var isArray = nativeIsArray || tagTester('Array');

  // Is a given variable an object?
  function isObject(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  }

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
  var isArguments = tagTester('Arguments');
  var isFunction = tagTester('Function');
  var isString = tagTester('String');
  var isNumber = tagTester('Number');
  var isDate = tagTester('Date');
  var isRegExp = tagTester('RegExp');
  var isError = tagTester('Error');
  var isSymbol = tagTester('Symbol');
  var isMap = tagTester('Map');
  var isWeakMap = tagTester('WeakMap');
  var isSet = tagTester('Set');
  var isWeakSet = tagTester('WeakSet');

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  (function() {
    if (!isArguments(arguments)) {
      isArguments = function(obj) {
        return _has(obj, 'callee');
      };
    }
  }());

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  function isFinite(obj) {
    return !isSymbol(obj) && _isFinite(obj) && !_isNaN(parseFloat(obj));
  }

  // Is the given value `NaN`?
  function isNaN(obj) {
    return isNumber(obj) && _isNaN(obj);
  }

  // Is a given value a boolean?
  function isBoolean(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  }

  // Is a given value equal to null?
  function isNull(obj) {
    return obj === null;
  }

  // Is a given variable undefined?
  function isUndefined(obj) {
    return obj === void 0;
  }

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  function has(obj, path) {
    if (!isArray(path)) {
      return _has(obj, path);
    }
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (obj == null || !hasOwnProperty.call(obj, key)) {
        return false;
      }
      obj = obj[key];
    }
    return !!length;
  }

  // Utility Functions
  // -----------------

  // Keep the identity function around for default iteratees.
  function identity(value) {
    return value;
  }

  // Predicate-generating functions. Often useful outside of Underscore.
  function constant(value) {
    return function() {
      return value;
    };
  }

  function noop(){}

  // Creates a function that, when passed an object, will traverse that object’s
  // properties down the given `path`, specified as an array of keys or indexes.
  function property(path) {
    if (!isArray(path)) {
      return shallowProperty(path);
    }
    return function(obj) {
      return deepGet(obj, path);
    };
  }

  // Generates a function for a given object that returns a given property.
  function propertyOf(obj) {
    if (obj == null) {
      return function(){};
    }
    return function(path) {
      return !isArray(path) ? obj[path] : deepGet(obj, path);
    };
  }

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  function matcher(attrs) {
    attrs = extendOwn({}, attrs);
    return function(obj) {
      return isMatch(obj, attrs);
    };
  }

  // Run a function **n** times.
  function times(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  }

  // Return a random integer between min and max (inclusive).
  function random(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // A (possibly faster) way to get the current timestamp as an integer.
  var now = Date.now || function() {
    return new Date().getTime();
  };

  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  function createEscaper(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  }
  var escape = createEscaper(escapeMap);
  var unescape = createEscaper(unescapeMap);

  // Traverses the children of `obj` along `path`. If a child is a function, it
  // is invoked with its parent as context. Returns the value of the final
  // child, or `fallback` if any child is undefined.
  function result(obj, path, fallback) {
    if (!isArray(path)) path = [path];
    var length = path.length;
    if (!length) {
      return isFunction(fallback) ? fallback.call(obj) : fallback;
    }
    for (var i = 0; i < length; i++) {
      var prop = obj == null ? void 0 : obj[path[i]];
      if (prop === void 0) {
        prop = fallback;
        i = length; // Ensure we don't continue iterating.
      }
      obj = isFunction(prop) ? prop.call(obj) : prop;
    }
    return obj;
  }

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  }

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  var templateSettings = _.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  function template(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  }

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  function chain(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  }

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  function chainResult(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  }

  // Add your own custom functions to the Underscore object.
  function mixin(obj) {
    each(functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_, args));
      };
    });
    return _;
  }

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return chainResult(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return chainResult(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return String(this._wrapped);
  };

  var allExports = ({
    'default': _,
    VERSION: VERSION,
    iteratee: iteratee,
    restArguments: restArguments,
    each: each,
    forEach: each,
    map: map,
    collect: map,
    reduce: reduce,
    foldl: reduce,
    inject: reduce,
    reduceRight: reduceRight,
    foldr: reduceRight,
    find: find,
    detect: find,
    filter: filter,
    select: filter,
    reject: reject,
    every: every,
    all: every,
    some: some,
    any: some,
    contains: contains,
    includes: contains,
    include: contains,
    invoke: invoke,
    pluck: pluck,
    where: where,
    findWhere: findWhere,
    max: max,
    min: min,
    shuffle: shuffle,
    sample: sample,
    sortBy: sortBy,
    groupBy: groupBy,
    indexBy: indexBy,
    countBy: countBy,
    toArray: toArray,
    size: size,
    partition: partition,
    first: first,
    head: first,
    take: first,
    initial: initial,
    last: last,
    rest: rest,
    tail: rest,
    drop: rest,
    compact: compact,
    flatten: flatten,
    without: without,
    uniq: uniq,
    unique: uniq,
    union: union,
    intersection: intersection,
    difference: difference,
    unzip: unzip,
    zip: zip,
    object: object,
    findIndex: findIndex,
    findLastIndex: findLastIndex,
    sortedIndex: sortedIndex,
    indexOf: indexOf,
    lastIndexOf: lastIndexOf,
    range: range,
    chunk: chunk,
    bind: bind,
    partial: partial,
    bindAll: bindAll,
    memoize: memoize,
    delay: delay,
    defer: defer,
    throttle: throttle,
    debounce: debounce,
    wrap: wrap,
    negate: negate,
    compose: compose,
    after: after,
    before: before,
    once: once,
    keys: keys,
    allKeys: allKeys,
    values: values,
    mapObject: mapObject,
    pairs: pairs,
    invert: invert,
    functions: functions,
    methods: functions,
    extend: extend,
    extendOwn: extendOwn,
    assign: extendOwn,
    findKey: findKey,
    pick: pick,
    omit: omit,
    defaults: defaults,
    create: create,
    clone: clone,
    tap: tap,
    isMatch: isMatch,
    isEqual: isEqual,
    isEmpty: isEmpty,
    isElement: isElement,
    isArray: isArray,
    isObject: isObject,
    isArguments: isArguments,
    isFunction: isFunction,
    isString: isString,
    isNumber: isNumber,
    isDate: isDate,
    isRegExp: isRegExp,
    isError: isError,
    isSymbol: isSymbol,
    isMap: isMap,
    isWeakMap: isWeakMap,
    isSet: isSet,
    isWeakSet: isWeakSet,
    isFinite: isFinite,
    isNaN: isNaN,
    isBoolean: isBoolean,
    isNull: isNull,
    isUndefined: isUndefined,
    has: has,
    identity: identity,
    constant: constant,
    noop: noop,
    property: property,
    propertyOf: propertyOf,
    matcher: matcher,
    matches: matcher,
    times: times,
    random: random,
    now: now,
    escape: escape,
    unescape: unescape,
    result: result,
    uniqueId: uniqueId,
    templateSettings: templateSettings,
    template: template,
    chain: chain,
    mixin: mixin
  });

  // Add all of the Underscore functions to the wrapper object.
  var _$1 = mixin(allExports);
  // Legacy Node.js API
  _$1._ = _$1;

  return _$1;

})));


}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],90:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
