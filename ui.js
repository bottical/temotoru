export function showElement(element) {
  if (element) {
    const defaultDisplay = element.getAttribute('data-default-display') || 'block';
    element.style.display = defaultDisplay;
  }
}

export function hideElement(element) {
  if (element) element.style.display = 'none';
}

export function updateUIOnAuthState(user, path) {
  const loginForm = document.getElementById('loginForm');
  const logoutButton = document.getElementById('logoutButton');
  const barcodeForm = document.getElementById('barcodeForm');
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const searchPageLink = document.getElementById('searchPageLink');
  const inputPageLink = document.getElementById('inputPageLink');

  if (user) {
    if ((path.endsWith('index.html') || path === '/temotoru/') && barcodeForm) {
      showElement(barcodeForm);
      hideElement(searchForm);
      showElement(searchPageLink);
    } else if (path.endsWith('search.html') && searchForm) {
      showElement(searchForm);
      hideElement(barcodeForm);
      showElement(inputPageLink);
    }
    hideElement(loginForm);
    showElement(logoutButton);
  } else {
    hideElement(barcodeForm);
    hideElement(searchForm);
    hideElement(searchPageLink);
    hideElement(inputPageLink);
    showElement(loginForm);
    hideElement(logoutButton);
    if (searchResults) searchResults.innerHTML = ''; // Clear search results
  }
}

export function formatTimestamp(time) {
  const year = time.getFullYear();
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const day = String(time.getDate()).padStart(2, '0');
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日${hours}:${minutes}:${seconds}`;
}
