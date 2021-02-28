var jq = require("jquery")

class MyImageSearcher {
  constructor(apiKey, container) {
    this.container = container;
    this.apiKey = apiKey;
  }
  
  display(url) {
    var img = document.createElement("img");
    img.src = url;
    img.width = 200;
    this.container.appendChild(img);
  }
  
  clearPictures() {
    this.container.innerHTML = '';   
  }
  
  searchImages(keywords) {
    var myKey = this.apiKey;
    var URL = "https://pixabay.com/api/?key="+myKey+"&q="+encodeURIComponent(keywords);
    jq.getJSON(URL, function(data){
      if (parseInt(data.totalHits) > 0)
          jq.each(data.hits, function(i, hit) {
            console.log(hit.pageURL);
            this.display(hit.previewURL);                                   
          });
      else
          console.log('No hits');
    });
  }  
}

module.exports = {
  PixaBayImageSearcher: MyImageSearcher
};