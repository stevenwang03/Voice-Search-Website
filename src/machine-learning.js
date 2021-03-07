
var tf = require("@tensorflow/tfjs")
var tmImage = require("@teachablemachine/image")

// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/3dYD-gu38/";

let model, webcam, labelContainer, maxPredictions;

// Load the image model and setup the webcam
async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // or files from your local hard drive
    // Note: the pose library adds "tmImage" object to your window (window.tmImage)
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    const flip = true; // whether to flip the webcam
    webcam = new tmImage.Webcam(200, 200, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append elements to the DOM
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
}

async function loop() {
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}


let predictWindow = []

// run the webcam image through the image model
async function predict() {
    // predict can take in an image, video or canvas html element
    const currentPrediction = await model.predict(webcam.canvas);

    predictWindow.push(currentPrediction);
    if(predictWindow.length > 25) {
      predictWindow.splice(0,1);
    }

    let upCount = 0;
    let downCount = 0;
    for(let w=0; w < predictWindow.length; w++) {
      let prediction = predictWindow[w];

      for (let i = 0; i < maxPredictions; i++) {
          const classPrediction =
              prediction[i].className + ": " + prediction[i].probability.toFixed(2);
          labelContainer.childNodes[i].innerHTML = classPrediction;

          if(prediction[i].className == "Raise hand" && prediction[i].probability > 0.85) {
            //window.scrollBy(0, -4);
            upCount = upCount + 1;
          }
          if(prediction[i].className == "Hand down" && prediction[i].probability > 0.85) {
            //window.scrollBy(0, 4);
            downCount = downCount + 1;
          }
      }
    }

    if(upCount > downCount + 2) {
      window.scrollBy(0, -4);
    }
    if(downCount > upCount + 2) {
      window.scrollBy(0, 4);
    }      
}

const startButton = document.getElementById("START_ML");
startButton.addEventListener("click", event=> init());
