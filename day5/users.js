// 1. Select DOM elements
const loadBtn = document.getElementById('load-users');
const filterInput = document.getElementById('filter-input');
const statusMsg = document.getElementById('status');
const usersList = document.getElementById('users-list');

let allUsers = [];
function renderUsers(usersToRender) {
    // Clear the current list
    usersList.innerHTML = '';
    
    if (usersToRender.length === 0) {
        const li = document.createElement('li');
        li.textContent = "No users match your filter.";
        usersList.appendChild(li);
        return;
    }
    
    usersToRender.forEach(user => {
        const li = document.createElement('li');
        
        const nameEl = document.createElement('strong');
        nameEl.textContent = user.name;
        
        const emailEl = document.createElement('div');
        emailEl.textContent = `Email: ${user.email}`;
        
        const cityEl = document.createElement('div');
        cityEl.textContent = `City: ${user.address.city}`;
        
        const companyEl = document.createElement('div');
        companyEl.textContent = `Company: ${user.company.name}`;
        
        // Append everything to the list item, then to the list
        li.appendChild(nameEl);
        li.appendChild(emailEl);
        li.appendChild(cityEl);
        li.appendChild(companyEl);
        usersList.appendChild(li);
    });
}

// 4. The main async function to fetch data
async function loadUsers() {

    loadBtn.disabled = true;
    filterInput.disabled = true;
    statusMsg.textContent = "Loading users...";
    usersList.innerHTML = ''; // Clear list while loading
    
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        allUsers = await response.json();
        
        // Success!
        statusMsg.textContent = `Successfully loaded ${allUsers.length} users.`;
        filterInput.disabled = false; // Enable filter now that we have data
        renderUsers(allUsers);
        
    } catch (error) {
     
        statusMsg.textContent = "Error: Failed to load users. Please try again.";
        console.error("Fetch error:", error);
    } finally {
    
        loadBtn.disabled = false;
    }
}


loadBtn.addEventListener('click', loadUsers);

filterInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    // Filter the stored array (no new network request!)
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
    );
    
    renderUsers(filteredUsers);
});