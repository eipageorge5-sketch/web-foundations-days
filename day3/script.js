let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to George", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];


function searchNotes(word) {
  const lowerWord = word.toLowerCase();
  
  return notes.filter(note => {
    return note.text.toLowerCase().includes(lowerWord);
  });
}



function longestNote() {

  if (notes.length === 0) return null;
  let longest = notes[0];
  
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {}; 
  
  for (const note of notes) {
    const cat = note.category;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  
  return counts;
}


function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  
  const noteWord = total === 1 ? "note" : "notes";
  
  const details = Object.keys(counts)
    .map(cat => `${counts[cat]} ${cat}`)
    .join(", ");
  
  return `${total} ${noteWord}: ${details}.`;
}
function isDuplicate(text) {
  const cleanText = text.trim().toLowerCase();
  
  return notes.some(note => {
    return note.text.trim().toLowerCase() === cleanText;
  });
}
function addNote(text, category) {
  const cleanText = text.trim();
  
  if (cleanText.length < 1 || cleanText.length > 200) {
    console.log("Failed: Text must be between 1 and 200 characters.");
    return false;
  }
  
  const validCategories = ["personal", "work", "study"];
  if (!validCategories.includes(category)) {
    console.log("Failed: Category must be personal, work, or study.");
    return false;
  }
  
  if (isDuplicate(cleanText)) {
    console.log("Failed: This note already exists.");
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text: cleanText, category: category });
  
  return true;
}


console.log(searchNotes("the"));

console.log(searchNotes("xyz"));

console.log(longestNote());

const savedNotes = notes;
notes = [];
console.log(longestNote());
notes = savedNotes;

console.log(countByCategory());

console.log(getSummary());

console.log(isDuplicate("Buy milk and bread"));

console.log(isDuplicate("Go for a run"));

console.log(addNote("Read a book", "personal"));

console.log(addNote("Call mum", "personal"));

console.log(addNote("Test", "invalid"));


console.log(addNote("", "work"));