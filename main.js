const flashcardHeader = document.getElementById('flashcardHeader');
const flashcardFooter = document.getElementById('flashcardFooter');
const answerInput = document.getElementById('answerInput');
const expandSettingsButton = document.getElementById('expandSettingsButton');
const collapseSettingsButton = document.getElementById('collapseSettingsButton');
const settingsOverlay = document.getElementById('settingsOverlay');
const deckSelectionDropdown = document.getElementById('deckSelectionDropdown');

// Settings
const DB_NAME = 'Flashcard Decks';
const DB_VERSION = 1;
var activeDatabase;
var activeDeck = localStorage.getItem('activeDeck');
var currentCard = '';

initializeUIEventListeners();
displayRandomFlashcardFromDeck();

function initializeUIEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        // event listener for the Answer Input field
        answerInput.addEventListener('keydown', e => {

            alert(`Key pressed: ${e.key}`);

            if (e.key === 'Enter') {
                e.preventDefault(); // prevent any default action triggered by the 'Enter' key
                checkAndRecordAnswer();
            }
        });
        // event listener for the "Expand Settings" button
        expandSettingsButton.addEventListener('click', () => { expandSettingsOverlay(); });
        // event listener for the "Collapse Settings" button
        collapseSettingsButton.addEventListener('click', () => { collapseSettingsOverlay(); });
        // event listener for the "Deck Selection" dropdown
        deckSelectionDropdown.addEventListener('change', onDeckSelectionChange);
    });
};

$("#answerInput").submit(function(){
    alert("Submitted");
});

function expandSettingsOverlay() {
    settingsOverlay.style.width = "100%";
};

function collapseSettingsOverlay() {
    settingsOverlay.style.width = "0%";
    displayRandomFlashcardFromDeck();
};

function onDeckSelectionChange() {
    const chosenDeck = this.value;
    localStorage.setItem('activeDeck', chosenDeck);
}

async function prepareDeck() {
    return new Promise((resolve, reject) => {
        // access the browser's IndexedDB storage and find 'DB_NAME' and 'DB_VERSION'
        const primaryDatabaseConnectionRequest = indexedDB.open(DB_NAME, DB_VERSION);

        primaryDatabaseConnectionRequest.onsuccess = event => {
            // set the 'activeDatabase' to the result of the Primary Database Connection
            activeDatabase = event.target.result;
            // create a read-only transaction for the Active Deck store
            const readOnlyTransaction = activeDatabase.transaction(activeDeck, 'readonly');
            const objectStore = readOnlyTransaction.objectStore(activeDeck);
            // retrieve all items from the Active Deck store
            objectStore.getAll().onsuccess = event => {
                if (event.target.result.length === 0) {
                    // fetch the deck from an external URL and save it to the browser's IndexedDB storage
                    fetch(`https://raw.githubusercontent.com/Luspin/Nihongo-Furasshukado-Hub/main/Decks/${activeDeck}.js`)
                        .then(response => response.json()) // convert the response to a JSON object
                        .then(data => {
                            // create a read-write transaction for the Active Deck store
                            const readWriteTransaction = activeDatabase.transaction(activeDeck, 'readwrite');
                            const objectStore = readWriteTransaction.objectStore(activeDeck);
                            // add each item from the external URL to the Active Deck store
                            data.forEach(item => objectStore.add(item));
                            // wait for the read-write transaction to complete...
                            readWriteTransaction.oncomplete = () => {
                                console.log(`"${activeDeck}" deck retrieved from from an external URL and stored in IndexedDB.`);
                                document.getElementById('activeDeck_Title').textContent = activeDatabase.objectStoreNames[0];
                                resolve(activeDatabase);
                            };

                            readWriteTransaction.onerror = (transactionError) => {
                                console.error(`Transaction error: ${transactionError}`);
                            };
                        })
                        .catch(error => {
                            console.error(`Error retrieving deck from external URL: ${error}`);
                        });
                } else {
                    console.log(`Found "${activeDatabase.objectStoreNames[0]}" deck in IndexedDB.`);
                    document.getElementById('activeDeck_Title').textContent = activeDatabase.objectStoreNames[0];
                    resolve(activeDatabase);
                }
            };
        };

        primaryDatabaseConnectionRequest.onerror = event => {
            console.error(`Couldn't connect to ${DB_NAME}: ${event.target.error}`);
            reject(new Error(`Couldn't connect to the ${DB_NAME} database.`));
        };

        primaryDatabaseConnectionRequest.onupgradeneeded = event => {
            activeDatabase = event.target.result;

            if (!activeDatabase.objectStoreNames.contains(activeDeck)) {
                const objectStore = activeDatabase.createObjectStore(activeDeck, { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('question', 'question', { unique: false });
                objectStore.createIndex('answer', 'answer', { unique: false });
                objectStore.createIndex('correctGuesses', 'correctGuesses', { unique: false });
                objectStore.createIndex('incorrectGuesses', 'incorrectGuesses', { unique: false });
                objectStore.createIndex('ratio', 'ratio', { unique: false });
            }
        };
    });
};

async function displayRandomFlashcardFromDeck() {
    activeDeck = localStorage.getItem('activeDeck');

    if (activeDeck === undefined || activeDeck === null) {
        expandSettingsOverlay();
        return;
    }

    // clear the 'answerInput' element
    answerInput.value = "";

    // await the promise regardless of its state ("Pending", "Resolved", or "Rejected")
    await prepareDeck();
    // create a read-only transaction for the Active Deck store
    const readOnlyTransaction = activeDatabase.transaction(activeDeck, 'readonly');
    const objectStore = readOnlyTransaction.objectStore(activeDeck);
    // retrieve all items from the Active Deck store
    objectStore.getAll().onsuccess = event => {
        const retrievedFlashcards = event.target.result;

        if (retrievedFlashcards.length > 0) {
            // select a random flashcard from the the Active Deck store
            const randomIndex = Math.floor(Math.random() * retrievedFlashcards.length);
            currentCard = retrievedFlashcards[randomIndex];

            flashcardHeader.textContent = `${currentCard.question}`;
            flashcardFooter.textContent = `✔️: ${currentCard.correctGuesses}; ❌: ${currentCard.incorrectGuesses}; ${calculateCorrectGuessRatio()}%`;

        } else {
            console.error(`Couldn't retrieve any flashcard from "${DB_NAME}/${activeDeck}".`);
        }

        // calculate the ratio of "correctGuesses" vs "incorrectGuesses"
        function calculateCorrectGuessRatio() {
            const guessRatio = (currentCard.incorrectGuesses === 0 && currentCard.correctGuesses > 0) ?
                100 :
                (currentCard.correctGuesses / (currentCard.correctGuesses + currentCard.incorrectGuesses)) * 100;

            return (isNaN(guessRatio)) ?
                0 :
                guessRatio.toFixed(0);
        }
    };
};

function checkAndRecordAnswer() {
    // create a read-write transaction for the Active Deck store
    const readWriteTransaction = activeDatabase.transaction(activeDeck, 'readwrite');
    const objectStore = readWriteTransaction.objectStore(activeDeck);

    if (answerInput.value.toLowerCase() == currentCard.answer) {
        currentCard.correctGuesses++;
        answerValidationMessage.textContent = '✔️';
    }
    else {
        currentCard.incorrectGuesses++;
        flashcardHeader.textContent = `${currentCard.answer}`;
        answerValidationMessage.textContent = '❌';
    }

    // update the card in the Active Deck store
    const updateRequest = objectStore.put(currentCard);

    updateRequest.onsuccess = () => {
        // show a new flashcard after 3 seconds
        setTimeout(() => {
            answerValidationMessage.textContent = '';
            displayRandomFlashcardFromDeck();
        }, 3000);
    };
};







/*

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








*/