
// client-side js, loaded by index.html
// run by the browser each time the page is loaded  

var myLib = require("./image-search");
var machine_learning = require('./machine-learning');


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
const displayArea = document.getElementById("DISPLAY")

var imageSearcher = new myLib.PixaBayImageSearcher("19419380-dc910ee0a7f8e64c10650f9f1", 
                                                   document.getElementById("PICTURE"));

function onStart() {
  //clearPictures(); 
  imageSearcher.clearPictures();
  recognition.start();
}

function onStop() {
  recognition.stop();
}

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

const startButton = document.getElementById("START");
startButton.addEventListener("click", event=> onStart());

const stopButton = document.getElementById("STOP");
stopButton.addEventListener("click", event=> onStop());

// define variables that reference elements on our page
const dreamsList = document.getElementById("dreams");
const dreamsForm = document.querySelector("form");



// a helper function that creates a list item for a given dream
function appendNewDream(dream) {
  const newListItem = document.createElement("li");
  newListItem.innerText = dream;
  dreamsList.appendChild(newListItem);
  imageSearcher.clearPictures();
  imageSearcher.searchImages(dream); // search for image
}

display("Please speak to trigger search"); 
imageSearcher.display(
  "https://i.pinimg.com/564x/46/da/e5/46dae512e375bee2664a025507da8795.jpg"
);

// fetch the initial list of dreams
fetch("/dreams")
  .then(response => response.json()) // parse the JSON from the server
  .then(dreams => {
    // remove the loading text
    dreamsList.firstElementChild.remove();
  
    // iterate through every dream and add it to our page
    //dreams.forEach(appendNewDream);
  
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
