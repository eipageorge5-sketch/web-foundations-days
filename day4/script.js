const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

function updateCounts() {
    const text = noteText.value;
    const charLen = text.length;
    
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    charCount.textContent = `${charLen} / 200 characters`;
    wordCount.textContent = `${words} words`;
    
    charCount.classList.remove('warning', 'over'); // Reset first
    if (charLen > 200) {
        charCount.classList.add('over');
    } else if (charLen > 180) {
        charCount.classList.add('warning');
    }
    
    localStorage.setItem('noteDraft', text);
}

noteText.addEventListener('input', updateCounts);

clearBtn.addEventListener('click', () => {
    noteText.value = '';
    updateCounts(); 
});

noteText.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        noteText.value = '';
        updateCounts();
    }
});


function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark');
        themeToggle.textContent = 'Light mode'; 
    } else {
        document.body.classList.remove('dark');
        themeToggle.textContent = 'Dark mode'; 
    }
  
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
   
    const isCurrentlyDark = document.body.classList.contains('dark');
    applyTheme(!isCurrentlyDark);
});

const savedDraft = localStorage.getItem('noteDraft');
if (savedDraft !== null) {
    noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === 'dark');
updateCounts();