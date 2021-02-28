var jq = require("jquery")

module.exports = {
  ImageSearcher: MyImageSearcher
};

function searchImages(container, keywords) {
    var myKey = "19419380-dc910ee0a7f8e64c10650f9f1";
    var URL = "https://pixabay.com/api/?key="+myKey+"&q="+encodeURIComponent(keywords);
    jq.getJSON(URL, function(data){
      if (parseInt(data.totalHits) > 0)
          jq.each(data.hits, function(i, hit) {
            console.log(hit.pageURL);
            showPicture(container, hit.previewURL);                                   
          });
      else
          console.log('No hits');
    });
}

function showPicture(container, url) {
  var img = document.createElement("img");
  img.src = url;
  img.width = 200;
  container.appendChild(img);
}

class MyImageSearcher {
  constructor(container) {
    this.container = container;
  }
  
  display(url) {
    showPicture(this.container, url)
  }
  
  clearPictures() {
    this.container.innerHTML = '';   
  }
  
  searchImages(keywords) {
    searchImages(this.container, keywords);
  }  
}