(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// client-side js, loaded by index.html
// run by the browser each time the page is loaded

console.log("hello world :o");
//var keyword_extractor = require("keyword-extractor");

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition

var recognition = new SpeechRecognition();

recognition.onresult = function(event) {
  var text = event.results[0][0].transcript;
  console.log('Confidence: ' + event.results[0][0].confidence);
  console.log(text);
  appendNewDream(text);
}

recognition.lang =  'en-US'; // zh for chinese
recognition.interimResults = true;
//recognition.start();

function onStart() {
  recognition.start();
}

function onStop() {
  recognition.stop();
}

function getKeyWords(sentence) {
  var extraction_result = keyword_extractor.extract(sentence,{
                                                                  language:"english",
                                                                  remove_digits: true,
                                                                  return_changed_case:true,
                                                                  remove_duplicates: false

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

},{}]},{},[1]);
