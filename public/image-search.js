var jq = require("jquery")

module.exports = {
  showPicture: showPicture,
  clearPictures: function(container) {
    container.innerHTML = '';
  },
  searchImage: searchImages
};

function searchImages(container, keywords) {
    var myKey = "19419380-dc910ee0a7f8e64c10650f9f1";
    var URL = "https://pixabay.com/api/?key="+myKey+"&q="+encodeURIComponent(keywords);
    jq.getJSON(URL, function(data){
      if (parseInt(data.totalHits) > 0)
          jq.each(data.hits, function(i, hit){ console.log(hit.pageURL);
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

class ImageSearcher {
  constructor(container) {
    this.container = container;
  }
  
  display(url) {
    showPicture(this.container, url)
  }
}