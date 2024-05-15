"use strict";
import * as CONSTANTS from './constants.js';
import { getCookie, setCookie } from './cookie.js';

/* Returns the value of a given GET parameter name */
export function findGetParameter(parameterName) {
  let result = null,
      tmp = [];
  location.search
      .substr(1)
      .split("&")
      .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
      });
  return result;
}

export function infoToPageURL(library, title, volume = null, page = null) {
  // If just the library and title are given
  if (library && title && !volume && !page) {
    if (library == CONSTANTS.booksURL()) {
      return CONSTANTS.homeURL() + 'title.html' + '?title=' + title;
    } else {
      return CONSTANTS.homeURL() + 'title.html' + '?library=' + library + '&title=' + title;
    }
  } else {
    let result = CONSTANTS.readerURL();
    if (library == CONSTANTS.booksURL()) {
      result += '?title=' + title;
    } else {
      result += '?library=' + library + '&title=' + title;
    }
    if (volume) result += '&volume=' + volume;
    if (page) result += '&page=' + page;
    return result;
  }
}

export function infoToImageURL(library, title, volume, page, extension) {
  return library + title + '/' + volume + '/' + page + extension;
}

export function stringToBoolean(string) {
  if (!string) return undefined;
  return string == 'true' || string == 'True';
}

// If the title isn't valid, go back to home page
export function assertsTitleExists(titles, title) {
  if (titles.indexOf(title) == -1) {
    window.location.href = CONSTANTS.homeURL();
  }
}

export function applyTheme() {
  const body = document.getElementsByTagName("body")[0];
  const cookieThemeSelection = parseInt(getCookie('themeSelection'));
  const themeSelection = !isNaN(cookieThemeSelection) ? cookieThemeSelection : (
    // Media Query to detect dark mode
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 0 : 1
   );
  const themeNames = ['darkTheme', 'lightTheme'];
  for (let i = 0; i < themeNames.length; i++) {
    body.classList.remove(themeNames[i]);
  }
  body.classList.add(themeNames[themeSelection]);
}

export function writeBookInfo(bookInfo, languageData, bookInfoDiv) {
  if (bookInfo.status && languageData.titlePage.status[bookInfo.status]) {
    const status = document.createElement("p");
    status.innerText = (
      languageData.titlePage.status[bookInfo.status] +
      (bookInfo.published
      ? ' - ' + bookInfo.published
      : '') 
    );
    status.id = "status";
    bookInfoDiv.appendChild(status);
  }

  if (bookInfo.genres && bookInfo.genres.length > 0) {
    const genres = document.createElement("div");
    genres.id = "genres";
    bookInfo.genres.forEach((genre, index) => {
      const line = document.createElement("p");
      line.innerText = genre;
      genres.appendChild(line);
    });
    bookInfoDiv.appendChild(genres);
  }

  if (bookInfo.language) {
    const status = document.createElement("p");
    status.innerText = languageData.titlePage.language + languageData.ps + ": " + bookInfo.language;
    status.id = "status";
    bookInfoDiv.appendChild(status);
  }

  if (bookInfo.authors) {
    const authors = document.createElement("div");
    authors.id = "authors";
    bookInfo.authors.forEach((author, index) => {
      if (languageData.titlePage.authors[author[0]]) {
        const line = document.createElement("p");
        line.innerText = languageData.titlePage.authors[author[0]] + languageData.ps + ': ' + author[1];
        authors.appendChild(line);
      }
    });
    bookInfoDiv.appendChild(authors);
  }

  if (bookInfo.serialization) {
    const serialization = document.createElement("p");
    serialization.innerText = languageData.titlePage.publication + languageData.ps + ": " + bookInfo.serialization;
    serialization.id = "serialization";
    bookInfoDiv.appendChild(serialization);
  }

  if (bookInfo.synopsis) {
    const synopsis = document.createElement("p");
    synopsis.innerText = bookInfo.synopsis;
    synopsis.id = "synopsis";
    bookInfoDiv.appendChild(synopsis);
  }
}

// Get retrieve a language
// languages must be the fetch result of lang/config.json
export function chooseLanguage() {
  return fetchLanguages()
    .then(languages => {

      // Priorities are:
      // Language selected by the user
      // Language given in parameters
      // Browser language
      let result;
      if (getCookie('lang') != '') {
        result = getCookie('lang');
      } else if (findGetParameter('lang') != null) {
        result = findGetParameter('lang')
      } else {
        result = navigator.language || navigator.userLanguage;
        result = result.substring(0, 2)
      }
      // Then if that language isn't valid, select the default one from constants
      if (!Object.keys(languages.languages).includes(result)) {
        result = CONSTANTS.defaultLanguage();
      }
      return result;
    });
}

export function chooseAndFetchLanguage() {
  return chooseLanguage()
    .then(languageName => fetchLanguage(languageName))
}

export function fetchLanguages() {
  return fetch(CONSTANTS.homeURL() + 'lang/config.json')
    .then(response => response.json())
}

export function fetchLanguage(languageName) {
  return fetch(CONSTANTS.homeURL() + 'lang/' + languageName + '.json')
    .then(response => response.json())
}

export function fetchLibrary(libraryURL) {
  let configUrl = libraryURL + 'config.json';

  if (localStorage.getItem('libraryConfig')) {
    configUrl = libraryURL + localStorage.getItem('libraryConfig');
  }

  return fetch(configUrl)
    .then(response => response.json());
}

export function fetchBook(libraryURL, title) {
  return fetch(libraryURL + title + '/' + 'config.json')
    .then(response => response.json())
}

export function fetchVolume(libraryURL, title, volume) {
  return fetch(libraryURL + title + '/' + volume + '/' + 'config.json')
    .then(response => response.json())
}

export function fetchBookInfo(libraryURL, title) {
  return fetch(libraryURL + title + '/' + 'info.json')
    .then(response => response.json())
}


export function notSafeForWorkWarning(languageData) {
  // Check if the user has already seen the warning (cookie, "nsfwWarningAccepted")
  // Display a Warning that the content on the page is not safe for work

  const cookieNSFW = getCookie('nsfwWarningAccepted');
  if (cookieNSFW && cookieNSFW == 'true') {
    return;
  }

  const body = document.getElementsByTagName("body")[0];
  const warning = document.createElement("div");
  warning.id = "nsfwWarning";
  warning.innerHTML = `
    <div>
      <h1>${languageData.nsfwWarning.title}</h1>
      <p>${languageData.nsfwWarning.desc}</p>
      <button id="nsfwWarningButton">${languageData.nsfwWarning.accept}</button>
      <button id="nsfwWarningButtonDecline">${languageData.nsfwWarning.deny}</button>
    </div>
  `;

  body.appendChild(warning);

  const acceptButton = document.getElementById("nsfwWarningButton");
  acceptButton.addEventListener("click", () => {
    setCookie('nsfwWarningAccepted', 'true', 365);
    body.removeChild(warning);
  });

  const declineButton = document.getElementById("nsfwWarningButtonDecline");
  declineButton.addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });
}