"use strict";
import * as CONSTANTS from './constants.js';
import { findGetParameter, applyTheme, infoToPageURL, infoToImageURL, chooseAndFetchLanguage, fetchBook, fetchLibrary, notSafeForWorkWarning } from './tools.js';

const libraryParam = findGetParameter('library');
const LIBRARY = libraryParam ? libraryParam : CONSTANTS.booksURL();

function applyLanguage(languageData) {
    document.title = CONSTANTS.websiteName() + ' - ' + languageData.homePage.home;
    document.getElementById("availableBooks").innerText = languageData.homePage.availableBooks;
}


function displayBook(bookData, title, index, isDividor) {
  isDividor = isDividor || false;
  
  const link = document.createElement("a");
  const p = document.createElement("p");
  const cover = document.createElement("img");

  link.href = infoToPageURL(LIBRARY, title);
  link.setAttribute('index', index);
  p.innerText = bookData.title;
  cover.src = infoToImageURL(LIBRARY, title, 1, 1, bookData.fileExtension);

  link.appendChild(p);
  link.appendChild(cover);

  if (isDividor) {
    link.style.gridColumnStart = 1;
  }

  document.getElementById("books").appendChild(link);
}

let LCONFIG = null;

chooseAndFetchLanguage()
  .then(languageData => LCONFIG = languageData)
  .then(() => applyLanguage(LCONFIG))
  .then(() => notSafeForWorkWarning(LCONFIG))
  .then(applyTheme)

  .then(() => fetchLibrary(LIBRARY))
  .then(libraryData => {
    const promiseList = [];

    var divNext = [];
    libraryData.titles.forEach((title, index) => {
      if (title === "DIVIDOR") {
        divNext.push(index + 1)
        return;
      }
      promiseList.push(
        fetchBook(LIBRARY, title)
          .then(bookData => displayBook(bookData, title, index, divNext.includes(index)))
      );
    })

    Promise.all(promiseList).then(() => {
      const books = document.getElementById("books");
      const links = books.getElementsByTagName("a");
      const linksArray = Array.from(links);
      linksArray.sort((a, b) => a.getAttribute('index') - b.getAttribute('index'));
      linksArray.forEach(link => books.appendChild(link));
    });
  });