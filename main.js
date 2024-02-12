const activeDeck_Title = document.getElementById('activeDeck_Title');
const flashcard_Header = document.getElementById('flashcard_Header');
const flashcard_Footer = document.getElementById('flashcard_Footer');
const answerInput      = document.getElementById('answerInput');
const settingsButton   = document.getElementById('settingsButton');

settingsButton.addEventListener('click', () => {
    // UNDEFINED
});

currentQuestion = '';
currentAnswer = '';

const ACTIVE_DB = null;
const DB_NAME = 'Flashcards';
const DB_VERSION = 1;

function openDatabase() {
    // Open the indexedDB database with the specified DB_NAME and DB_VERSION
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Handle the "onSuccess" event
    request.onsuccess = event => {
        const ACTIVE_DB = event.target.result;

        // Retrieve flashcards from the 'Hiragana' deck
        const transaction = ACTIVE_DB.transaction('Hiragana', 'readonly');
        const objectStore = transaction.objectStore('Hiragana');

        // Check if the flashcards exist in the database
        objectStore.getAll().onsuccess = event => {
            const flashcards = event.target.result;
            if (flashcards.length === 0) {
                // If no flashcards exist, fetch them from an external URL and add them to the database
                fetch('https://raw.githubusercontent.com/Luspin/flashokaado/main/Decks/Hiragana.js')
                .then(response => response.json())
                .then(data => {
                  const transaction = ACTIVE_DB.transaction('Hiragana', 'readwrite');
                  const objectStore = transaction.objectStore('Hiragana');
                  data.forEach(item => objectStore.add(item));
                  // console.log('Database loaded from external URL');
                  activeDeckTitle.textContent = ACTIVE_DB.objectStoreNames[0];
                  displayRandomFlashcard()
                })
                .catch(error => console.error('Error loading database from external URL:', error));
            } else {
              console.log('Deck already exists locally.');
              activeDeck_Title.textContent = ACTIVE_DB.objectStoreNames[0];
            }
        };

        // Display a random flashcard
        displayRandomFlashcard();
        // fetchFlashcards();
    };

    // Handle the "onError" event
    request.onerror = event => {
        console.error('Error when opening Database.', event.target.error);
    };

    // Handle the "onUpgradeNeeded" event
    request.onupgradeneeded = event => {
        const ACTIVE_DB = event.target.result;
        // Create an object store called 'Hiragana' with auto-incrementing key
        const objectStore = ACTIVE_DB.createObjectStore('Hiragana', { keyPath: 'id', autoIncrement: true });
        // Create indexes for 'question', 'answer', and 'seenTimes' fields
        objectStore.createIndex('question', 'question', { unique: false });
        objectStore.createIndex('answer', 'answer', { unique: false });
        objectStore.createIndex('seenTimes', 'seenTimes', { unique: false });
    };
}

openDatabase();

const answer_Button = document.getElementById('answer_Button');
const answerField_2 = document.getElementById('answerField_2');
const flashcardList = document.getElementById('flashcardList');
const answerCheck = document.getElementById('answerCheck');
const activeDeckTitle = document.getElementById('activeDeckTitle');
const answerValidation = document.getElementById('answerValidation');



const nextCardButton = document.getElementById('nextCard_Button');
const flashcardForm = document.getElementById('flashcardInsertionForm');
const addFlashcardButton = document.getElementById('addFlashcard_Button');
const importButton = document.getElementById('importDB_Button');
const exportButton = document.getElementById('exportDB_Button');
const clearDBButton = document.getElementById('clearDB_Button');
const backupFileInput = document.getElementById('filePicker');





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
    answerValidation.innerHTML = "";
    answerField_2.value = "";
    displayRandomFlashcard();
});

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
                flashcard_Header.textContent = `${randomFlashcard.question}`;
                flashcard_Footer.textContent = `Seen Times: ${randomFlashcard.seenTimes}; Percentage Correct: xy.z %`;
                currentAnswer = `${randomFlashcard.answer}`;
                // console.log(currentAnswer);
            };

            flashcard_Header.onclick = () => {
                flashcard_Header.textContent = `${randomFlashcard.answer}`;
            }

        } else {
            flashcard_Header.textContent = 'No flashcards available.';
        }
    };
};

answer_Button.addEventListener('click', (e) => {
    checkAnswer();
});

function checkAnswer() {
    if (answerField_2.value.toLowerCase() == currentAnswer) {
        // console.log("CORRECT");
        answerValidation.innerHTML = "CORRECT";
    }
    else {
        // console.log("INCORRECT");
        flashcard_Header.textContent =  `${currentAnswer}`;
        answerValidation.innerHTML = `INCORRECT`;
    }
}

answerField_2.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        e.preventDefault();
        answer_Button.click();
    }
});

