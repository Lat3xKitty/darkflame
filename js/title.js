"use strict";
import * as CONSTANTS from './constants.js';
import { findGetParameter, applyTheme, infoToImageURL, infoToPageURL, writeBookInfo, fetchBookInfo, assertsTitleExists, chooseAndFetchLanguage, fetchLibrary, fetchBook, notSafeForWorkWarning } from './tools.js';

function displayBookData(bookData) {
  // Change the title of the webpage
  document.title = CONSTANTS.websiteName() + ' - ' + bookData.title;

  const bookTitle = document.createElement("h2");
  const bookInfoDiv = document.getElementById("bookInfo")
  bookTitle.innerText = bookData.title;
  bookInfoDiv.appendChild(bookTitle);

  fetchBookInfo(LIBRARY, TITLE)
    .then(bookInfo => writeBookInfo(bookInfo, LCONFIG, bookInfoDiv));

  for (let i = 1; i <= bookData.numVolumes; i++) {
    const link = document.createElement("a");
    const p = document.createElement("p");
    const cover = document.createElement("img");

    link.href = infoToPageURL(LIBRARY, TITLE, i);
    if (bookData.numVolumes > 0) {
      var volumeName = null;
      if (bookData.volumeNames && bookData.volumeNames[i - 1]) {
        volumeName = bookData.volumeNames[i - 1];
      }
      var volumePrefix = LCONFIG.titlePage.chapterLabel['chapter'] + ' ' + i;
      if (bookData.volumeKey && LCONFIG.titlePage.chapterLabel[bookData.volumeKey]) {
        volumePrefix = LCONFIG.titlePage.chapterLabel[bookData.volumeKey] + ' ' + i;
      }
      else if (bookData.volumeKey && bookData.volumeKey === "none") {
        volumePrefix = '';
      }
  
      p.innerText =
        volumePrefix +
        (volumeName
          ? (bookData.volumeKey !== "none" ? ": " : "") +
            volumeName
          : "");
    }
    cover.src = infoToImageURL(LIBRARY, TITLE, i, 1, bookData.fileExtension);
  
    link.appendChild(p);
    link.appendChild(cover);
    document.getElementById("volumes").appendChild(link);
  }
}

const libraryParam = findGetParameter('library');
const LIBRARY = libraryParam ? libraryParam : CONSTANTS.booksURL();

let LCONFIG;
const TITLE = findGetParameter('title');

chooseAndFetchLanguage()
  .then(languageData => LCONFIG = languageData)
  .then(() => notSafeForWorkWarning(LCONFIG))
  .then(() => fetchLibrary(LIBRARY))
  .then(libraryData => assertsTitleExists(libraryData.titles, TITLE))
  .then(() => document.getElementById("volumes").classList.add(TITLE))
  .then(applyTheme)
  .then(() => fetchBook(LIBRARY, TITLE))
  .then(bookData => displayBookData(bookData));
