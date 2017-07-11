'use strict';

function throttle(fn, wait) {
  let time = Date.now();
  return () => {
    if ((time + (wait - Date.now())) < 0) {
      fn();
      time = Date.now();
    }
  };
}

function formatDate(date) {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  let month = dateObj.getMonth() + 1;
  if (month < 10) {
    month = `0${month}`;
  }
  let day = dateObj.getDate();
  if (day < 10) {
    day = `0${day}`;
  }
  return `${day}-${month}-${year}`;
}

function filterByInput(posts) {
  const input = document.querySelector('.search input');
  const searchString = input.value.toLowerCase();
  if (searchString === '') {
    return posts;
  }
  const searchArray = searchString.split(' ');
  return posts.filter(post => searchArray.every(word => post.title.toLowerCase().includes(word)));
}

function checkLocalStorage() {
  let activeTags = localStorage.getItem('tags');
  if (!activeTags) {
    return [];
  }
  activeTags = activeTags.split(',');
  const tagsOnPage = [...document.querySelectorAll('.all-tags-wrapper span')];
  tagsOnPage.forEach((onPageTag) => {
    activeTags.forEach((activeTag) => {
      if (onPageTag.innerHTML === activeTag) onPageTag.className = 'active';
    });
  });
  return activeTags;
}

// Тут, мне кажется, я должен объяснить что к чему. Функция filterByTags принимает список постов
// для фильтрации, выясняет, какие теги на данный момент активны, и добавляет к объекту поста
// новое свойство с количетсвом совпавших тегов (тех, что у поста и тех, которые активны). Далее,
// изначально этот массив сортировался по новому свойству и передавался в функцию filterByDate.
// Однако, как оказалось (или я натупил хех), метод массива sort при сортировке нарушает порядок
// элементов, и массив, который получался в результате, был в перемешку отсортирован по дате и по
// количеству совпавших тегов. Чтобы решить проблему, я решил создать отдельную функцию, которая
// разбивала бы массив на более мелкие массивы по количеству совпавших тегов. То есть на массив из
// постов, в которых совпало 3 тега, 2 тега и т.д. splitIntoSeparateArrays делает именно это. Она
// разбивает массив и передает дальше объект, в котором находится массив из этих самых мелких
// подмассивов. Общий массив (containerArr) для того, чтобы легче было потом объединить с помощью
// reduce. Объект для того, чтобы функция filterByDate могла понять, рендерится список постов с
// учетом тегов (объект) или нет (просто массив).

function splitIntoSeparateArrays(arrayOfPosts, maxTags) {
  const obj = {};
  const containerArr = [];
  let counter = 0;
  let max = maxTags;
  while (max) {
    const index = arrayOfPosts.findIndex((post) => post.currentFiltersMatch < max);
    containerArr[counter] = arrayOfPosts.splice(0, index);
    counter += 1;
    max -= 1;
    if (max === 0) {
      containerArr[counter] = arrayOfPosts;
    }
  }
  obj.arr = containerArr;
  return obj;
}

function filterByTags(posts) {
  let activeTags = [...document.querySelectorAll('.all-tags-wrapper .active')];
  activeTags = activeTags.map(tagSpan => tagSpan.innerHTML);
  activeTags.sort();
  if (!activeTags.length) {
    activeTags = checkLocalStorage();
    if (!activeTags.length) return posts;
  }
  if (activeTags.length) localStorage.setItem('tags', activeTags);
  let filteredArray = [...posts];
  let maxPossibleTags = 0;
  filteredArray.forEach((post) => {
    let matches = 0;
    activeTags.forEach((activeTag) => {
      if (post.tags.includes(activeTag)) matches += 1;
      if (matches > maxPossibleTags) maxPossibleTags = matches;
    });
    post.currentFiltersMatch = matches;
  });
  filteredArray = filteredArray.sort((a, b) => b.currentFiltersMatch - a.currentFiltersMatch);
  return splitIntoSeparateArrays(filteredArray, maxPossibleTags);
}

function filterByDate(posts) {
  if (Array.isArray(posts)) {
    return posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  posts.arr.forEach(array => array.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  return posts.arr.reduce((a, b) => a.concat(b), []);
}

function filterPosts(posts) {
  let filteredPosts = filterByInput(posts);
  filteredPosts = filterByTags(filteredPosts);
  filteredPosts = filterByDate(filteredPosts);
  return filteredPosts;
}

function renderPosts(posts, scrollCounter) {
  const postsLimited = posts.slice(0, scrollCounter * 10);
  const container = document.createElement('section');
  container.className = 'posts-list';
  postsLimited.forEach((post) => {
    const title = document.createElement('h2');
    title.innerHTML = post.title;
    const text = document.createElement('p');
    text.innerHTML = post.description;
    const image = document.createElement('img');
    image.setAttribute('src', post.image);
    const closeButton = document.createElement('span');
    closeButton.className = 'close-button';
    const tags = document.createElement('div');
    tags.className = 'post-tags';
    post.tags.forEach((tag) => {
      const tagSpan = document.createElement('span');
      tagSpan.innerHTML = tag;
      tags.appendChild(tagSpan);
    });
    const date = document.createElement('span');
    date.className = 'post-date';
    date.innerHTML = formatDate(post.createdAt);
    const postContainer = document.createElement('div');
    postContainer.className = 'post';
    postContainer.appendChild(image);
    postContainer.appendChild(title);
    postContainer.appendChild(text);
    postContainer.appendChild(closeButton);
    postContainer.appendChild(tags);
    postContainer.appendChild(date);
    container.appendChild(postContainer);
  });
  document.querySelector('.root').appendChild(container);
}

function render(posts, scrollCounter) {
  const postsList = document.querySelector('.posts-list');
  if (postsList) postsList.parentNode.removeChild(postsList);
  const postsToRender = filterPosts(posts);
  renderPosts(postsToRender, scrollCounter);
}

function extractTags(posts) {
  let allTags = posts.reduce((initialValue, post) => `${initialValue},${post.tags.join(',')}`, '');
  allTags = allTags.split(',');
  allTags.shift();
  // избавляюсь от дупликатов с помощью Set
  return Array.from(new Set(allTags));
}

function renderTags(tags) {
  const container = document.createElement('div');
  container.className = 'all-tags-wrapper';
  tags.forEach((tag) => {
    const tagSpan = document.createElement('span');
    tagSpan.innerHTML = tag;
    container.appendChild(tagSpan);
  });
  document.querySelector('.root').appendChild(container);
}

fetch('https://api.myjson.com/bins/152f9j')
  .then(response => response.json())
  .then((response) => {
    const allPosts = response.data;
    const tags = extractTags(allPosts);
    renderTags(tags);
    const root = document.querySelector('.root');
    const searchInput = document.querySelector('.search input');
    const tagsWrapper = document.querySelector('.all-tags-wrapper');
    let scrollCounter = 1;
    searchInput.addEventListener('input', () => {
      render(allPosts, scrollCounter);
    });
    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!target.classList.contains('close-button')) return;
      const parentTitle = target.parentNode.querySelector('h2').innerHTML;
      allPosts.forEach((post, i) => {
        if (post.title === parentTitle) allPosts.splice(i, 1);
      });
      const scroll = window.scrollY;
      render(allPosts, scrollCounter);
      window.scrollTo(0, scroll);
    });

    tagsWrapper.addEventListener('click', (event) => {
      const target = event.target;
      if (target.tagName !== 'SPAN') {
        return;
      }
      if (target.classList.contains('active')) {
        target.classList.remove('active');
        localStorage.clear();
      } else {
        target.classList.add('active');
      }
      scrollCounter = 1;
      render(allPosts, scrollCounter);
    });


    function scrollHandler() {
      if (window.pageYOffset > document.documentElement.scrollHeight - document.documentElement.clientHeight - 100) {
        scrollCounter += 1;
        render(allPosts, scrollCounter);
      }
    }
    window.addEventListener('scroll', throttle(scrollHandler, 50));

    render(allPosts, scrollCounter);
  })
  .catch(error => console.log(error));
