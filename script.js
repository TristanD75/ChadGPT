document.addEventListener("DOMContentLoaded", function() {
    var main = document.querySelector('main');
    var nav = document.querySelector('nav');
    var fleche = document.querySelector('.fleche');
    var topBar = document.querySelector('.top-bar');
    var bottomBar = document.querySelector('.bottom-bar');
    var isExpanded = false; 
    const chatDiv = document.querySelector('.chat');

    fleche.addEventListener('click', function() {
        if (!isExpanded) {
            main.style.width = 'calc(100% - 44px)';
            nav.style.display = 'none';
            isExpanded = true;
        } else {
            nav.style.display = 'block';
            main.style.width = 'calc(100% - 280px - 23px - 22px)';
            isExpanded = false;
        }
    });

    fleche.addEventListener('mouseover', function() {
        if (isExpanded) {
            topBar.style.transform = 'rotate(-20deg)';
            bottomBar.style.transform = 'rotate(20deg)';
            topBar.style.backgroundColor = 'white';
            bottomBar.style.backgroundColor = 'white';
        } else {
            topBar.style.transform = 'rotate(20deg)';
            bottomBar.style.transform = 'rotate(-20deg)';
            topBar.style.backgroundColor = 'white';
            bottomBar.style.backgroundColor = 'white';
        }
    });

    fleche.addEventListener('mouseout', function() {
        topBar.style.transform = 'rotate(0deg)';
        bottomBar.style.transform = 'rotate(0deg)';
        topBar.style.backgroundColor = 'rgb(146, 146, 146)';
        bottomBar.style.backgroundColor = 'rgb(146, 146, 146)';
    });

});

    document.getElementById('userInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendButtonClick();
        }
    });

    const ws = new WebSocket('ws://localhost:8765');
    const chatDiv = document.querySelector('.chat');
    let shouldScroll;

    ws.onopen = function() {
        ws.send('session_' + Date.now());
    };

    ws.onmessage = function(event) {
        const responseElement = document.querySelector('.response.loading');
        parseAndDisplayTable(event.data, responseElement);
        responseElement.classList.remove('loading');
        if (shouldScroll) {
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    };

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0 && mutation.addedNodes[0].nodeType === Node.ELEMENT_NODE) {
                document.querySelector('.title').style.display = 'none';
            }
        });
    });

    const observerConfig = { childList: true, subtree: true };
    observer.observe(chatDiv, observerConfig);

    function handleSendButtonClick() {
        const userInput = document.getElementById('userInput');
        if (userInput.value.trim() !== '') {
            shouldScroll = chatDiv.scrollHeight - chatDiv.clientHeight <= chatDiv.scrollTop + 60;
            createMessageElement(userInput.value, 'user');
            const responseElement = createMessageElement('', 'response loading');
            addLoadingSpinner(responseElement);
            ws.send(userInput.value);
            userInput.value = '';
            if (shouldScroll) {
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }
        }
    }

    function exportTableToExcel(table, filename = '') {
        const dataType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const excelBlob = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBlob], { type: dataType });
        filename = filename ? filename + '.xlsx' : 'excel_data.xlsx';
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            const downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    }

    function createMessageElement(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        if (type.includes('response')) {
            messageDiv.classList.add('response');
        } else {
            messageDiv.classList.add('user');
        }
        if (type.includes('loading')) {
            messageDiv.classList.add('loading');
        }
        text.split('').forEach((letter, index) => {
            const letterSpan = document.createElement('span');
            letterSpan.textContent = letter;
            letterSpan.style.animationDelay = `${index * 0.01}s`;
            messageDiv.appendChild(letterSpan);
        });
        chatDiv.appendChild(messageDiv);
        return messageDiv;
    }


    function addLoadingSpinner(element) {
        const loaderDiv = document.createElement('div');
        loaderDiv.className = 'loader';
        element.appendChild(loaderDiv);
    }

    function parseAndDisplayTable(responseText, element) {
        if (responseText.includes('asc[') && responseText.includes('data[')) {
            const lines = responseText.split(']');
            const table = document.createElement('table');
            let cellIndex = 0;
            const tableContainer = document.createElement('div');
            tableContainer.style.overflowX = 'auto';
            tableContainer.style.overflowY = 'hidden';
            tableContainer.style.height = '100%';
            tableContainer.style.width = '100%';

            lines.forEach(line => {
                if (line.trim().length === 0) return;
                const parts = line.split('[');
                if (parts.length < 2) return;
                const type = parts[0].trim();
                const content = parts[1];
                const cells = content.split('|');
                const row = table.insertRow();

                cells.forEach(cell => {
                    const cellContent = cell.trim();
                    if (cellContent.length > 0) {
                        const cellElement = row.insertCell();
                        cellElement.textContent = cellContent;
                        cellElement.style.border = '1px solid rgba(0, 0, 0, 0)';
                        cellElement.style.opacity = 0;
                        cellElement.style.animation = `fade-in-cell 1s forwards`;
                        cellElement.style.animationDelay = `${cellIndex * 0.01}s`;
                        cellIndex++;

                        if (type === 'asc') {
                            cellElement.style.fontWeight = 'bold';
                        }
                    }
                });
            });

            tableContainer.appendChild(table);
            element.textContent = '';
            element.appendChild(tableContainer);

            const downloadIcon = document.createElement('span');
            downloadIcon.className = 'download-icon';
            downloadIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM376.9 294.6L269.8 394.5c-3.8 3.5-8.7 5.5-13.8 5.5s-10.1-2-13.8-5.5L135.1 294.6c-4.5-4.2-7.1-10.1-7.1-16.3c0-12.3 10-22.3 22.3-22.3l57.7 0 0-96c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32l0 96 57.7 0c12.3 0 22.3 10 22.3 22.3c0 6.2-2.6 12.1-7.1 16.3z"/></svg>';
            downloadIcon.onclick = function() { exportTableToExcel(table, 'table-data'); };

            const messageParent = element.closest('.message');
            messageParent.appendChild(downloadIcon);


        } else {
            element.style.overflowX = 'visible';
            element.style.overflowY = 'visible';
            element.innerHTML = '';
            const textContainer = document.createElement('div');
            element.appendChild(textContainer);

            responseText.split('').forEach((letter, index) => {
                const letterSpan = document.createElement('span');
                letterSpan.textContent = letter;
                letterSpan.style.opacity = 0;
                letterSpan.style.animation = `fade-in 0.5s forwards`;
                letterSpan.style.animationDelay = `${index * 0.01}s`;
                textContainer.appendChild(letterSpan);
            });
        }
    }
