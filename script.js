// script.js
const flashcardForm = document.getElementById('flashcardInsertionForm');
const addFlashcardButton = document.getElementById('addFlashcard_Button');
const importButton = document.getElementById('importDB_Button');
const exportButton = document.getElementById('exportDB_Button');
const clearDBButton = document.getElementById('clearDB_Button');
const backupFileInput = document.getElementById('filePicker');
const randomFlashcardElement = document.getElementById('randomFlashcard');
const nextCardButton = document.getElementById('nextCard_Button');
const answer_Button = document.getElementById('answer_Button');
const answerField_2 = document.getElementById('answerField_2');
const flashcardList = document.getElementById('flashcardList');
const answerCheck = document.getElementById('answerCheck');

const DB_NAME = 'Flashcards';
const DB_VERSION = 1;
let db;

function openDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
        const db = event.target.result;
        const objectStore = db.createObjectStore('Hiragana', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('question', 'question', { unique: false });
        objectStore.createIndex('answer', 'answer', { unique: false });
        objectStore.createIndex('seenTimes', 'seenTimes', { unique: false });
    };

    request.onsuccess = event => {
        db = event.target.result;
        displayRandomFlashcard();
        // fetchFlashcards();
    };

    request.onerror = event => {
        console.error('Error opening Database.', event.target.error);
    };
}

openDB();

function fetchFlashcards() {
    flashcardList.innerHTML = '';

    const objectStore = db.transaction('Hiragana').objectStore('Hiragana');

    objectStore.openCursor().onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>Question:</strong> ${cursor.value.question}<br>
                <strong>Answer:</strong> ${cursor.value.answer}
            `;
            flashcardList.appendChild(li);
            cursor.continue();
        }
    };
}

function addFlashcard(question, answer) {
    const flashcard = { question, answer };
    const transaction = db.transaction('Hiragana', 'readwrite');
    const objectStore = transaction.objectStore('Hiragana');
    objectStore.add(flashcard);
    transaction.oncomplete = () => fetchFlashcards();
}

addFlashcardButton.addEventListener('click', () => {
    const questionInput = document.getElementById('questionField');
    const answerInput = document.getElementById('answerField');

    const question = questionInput.value;
    const answer = answerInput.value;

    if (question && answer) {
        addFlashcard(question, answer);
        questionInput.value = '';
        answerInput.value = '';
    }
});

exportButton.addEventListener('click', () => {
    const objectStore = db.transaction('Hiragana').objectStore('Hiragana');

    objectStore.getAll().onsuccess = event => {
      const data = event.target.result;
      const jsonData = JSON.stringify(data, null, 2);
  
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flashcards.json';
      a.textContent = 'Download JSON Backup';
      a.click();
      // document.body.appendChild(a);
    };
});

backupFileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        importData(file);
    }
}

importButton.addEventListener('click', () => {
    importData() 
});

function importData(file) {
    const reader = new FileReader();

    reader.onload = event => {
        const jsonData = event.target.result;
        const data = JSON.parse(jsonData);

        const transaction = db.transaction('Hiragana', 'readwrite');
        const objectStore = transaction.objectStore('Hiragana');

        data.forEach(item => {
            objectStore.add(item);
        });

        transaction.oncomplete = () => {
            alert('Data imported successfully.');
            // fetchFlashcards(); // Update the list of flashcards
        };
    };

    reader.readAsText(file);
}

clearDBButton.addEventListener('click', () => {
    const transaction = db.transaction('Hiragana', 'readwrite');
    const objectStore = transaction.objectStore('Hiragana');

    const request = objectStore.clear();

    request.onsuccess = () => {
        console.log('IndexedDB cleared');
        // location.reload(); // Reload the page to update the data
        fetchFlashcards(); // Update the list of flashcards
    };

    request.onerror = event => {
        console.error('Error clearing IndexedDB:', event.target.error);
    };
});

nextCardButton.addEventListener('click', () => {
    displayRandomFlashcard();
});

currentQuestion = '';
currentAnswer = '';

function displayRandomFlashcard() {
    const transaction = db.transaction('Hiragana', 'readwrite');
    const objectStore = transaction.objectStore('Hiragana');

    objectStore.getAll().onsuccess = event => {
        const flashcards = event.target.result;
        if (flashcards.length > 0) {
            const randomIndex = Math.floor(Math.random() * flashcards.length);
            const randomFlashcard = flashcards[randomIndex];

            // Increment the seenTimes counter
            randomFlashcard.seenTimes = (randomFlashcard.seenTimes || 0) + 1;

            // Use the put method in the transaction's onsuccess event
            const updateRequest = objectStore.put(randomFlashcard);
            
            updateRequest.onsuccess = () => {
                // Update the UI
                randomFlashcardElement.textContent = `Hiragana: ${randomFlashcard.question}; Seen Times: ${randomFlashcard.seenTimes}`;
                currentAnswer = `${randomFlashcard.answer}`;
                console.log(currentAnswer);
            };

            randomFlashcardElement.onclick = () => {
                randomFlashcardElement.textContent = `Romaji: ${randomFlashcard.answer}; Seen Times: ${randomFlashcard.seenTimes}`;
            }

        } else {
            randomFlashcardElement.textContent = 'No flashcards available.';
        }
    };
};

answer_Button.addEventListener('click', (e) => {

    if (answerField_2.value == currentAnswer) {
        console.log("CORRECT");
        answerCheck.innerHTML = "CORRECT";
    }
    else {
        console.log("INCORRECT");
        answerCheck.innerHTML = `INCORRECT - answer was "${currentAnswer}"`;
    }
});