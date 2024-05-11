"use strict";
import * as CONSTANTS from './constants.js';
import { findGetParameter, applyTheme, infoToPageURL, infoToImageURL, chooseAndFetchLanguage, fetchBook, fetchLibrary } from './tools.js';

const libraryParam = findGetParameter('library');
const LIBRARY = libraryParam ? libraryParam : CONSTANTS.booksURL();

function applyLanguage(languageData) {
    document.title = CONSTANTS.websiteName() + ' - ' + languageData.homePage.home;
    document.getElementById("availableBooks").innerHTML = languageData.homePage.availableBooks;
}

function displayBook(bookData, title, index) {
  const link = document.createElement("a");
  const p = document.createElement("p");
  const cover = document.createElement("img");

  link.href = infoToPageURL(LIBRARY, title);
  link.setAttribute('index', index);
  p.innerHTML = bookData.title;
  cover.src = infoToImageURL(LIBRARY, title, 1, 1, bookData.fileExtension);

  link.appendChild(p);
  link.appendChild(cover);

  document.getElementById("books").appendChild(link);
}

chooseAndFetchLanguage()
  .then(languageData => applyLanguage(languageData))
  .then(applyTheme)

  .then(() => fetchLibrary(LIBRARY))
  .then(libraryData => {
    const promiseList = [];
    libraryData.titles.forEach((title, index) => {
      promiseList.push(
        fetchBook(LIBRARY, title)
          .then(bookData => displayBook(bookData, title, index))
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
