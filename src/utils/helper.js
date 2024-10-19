const getAppLogoMarkup = (img_path) => {
  return `
    <div style="display:flex; justify-content:center; ">
      <img src="${img_path}" alt="hegroup-logo" />
      <h1 class="text-white font-inter text-md" style="color:white; font-size:14px; margin-left:4px;">HE GROUP</h1>
    </div>
  `;
};

const formatString = (inputString) => {
  const words = inputString.split('_');
  const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return capitalizedWords.join(' ');
}

const createSlug = (inputString, charString = "-") => {
  const lowercaseString = inputString.toLowerCase();
  const words = lowercaseString.split(' ');
  const slug = words.join(charString);
  return slug;
};

module.exports = {
  getAppLogoMarkup,
  createSlug,
  formatString
};
