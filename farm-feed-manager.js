// Farm Feed Management
document.addEventListener('DOMContentLoaded', function () {

    // Populate feeds dropdown
    function populateFarmFeedsSelect() {
        const feedsSelect = document.querySelector('#farmFeedsAvailable');
        if (!feedsSelect || typeof FEED_DATA === 'undefined') return;

        feedsSelect.innerHTML = '';
        Object.keys(FEED_DATA).sort().forEach(feedName => {
            const option = document.createElement('option');
            option.value = feedName;
            option.textContent = feedName;
            feedsSelect.appendChild(option);
        });
    }

    // Call when FEED_DATA is loaded
    if (typeof FEED_DATA !== 'undefined') {
        populateFarmFeedsSelect();
    }

    // Also call after a delay to ensure FEED_DATA is loaded
    setTimeout(populateFarmFeedsSelect, 1000);

    // Make it globally available for reloading
    window.populateFarmFeedsSelect = populateFarmFeedsSelect;

    // Migrate existing farms to include new fields
    function migrateFarms() {
        const currentUser = localStorage.getItem('sessionUser');
        if (!currentUser) return;

        const fincasKey = `fincas_${currentUser}`;
        const fincas = JSON.parse(localStorage.getItem(fincasKey) || '[]');

        let migrated = false;
        fincas.forEach(finca => {
            if (!finca.feedingSystem) {
                // Set defaults based on existing management type
                if (finca.management === 'Intensivo') {
                    finca.feedingSystem = 'Feedlot';
                } else if (finca.management === 'Extensivo') {
                    finca.feedingSystem = 'Pastoreo';
                } else {
                    finca.feedingSystem = 'Mixto';
                }
                migrated = true;
            }

            if (!finca.feedsAvailable) {
                finca.feedsAvailable = [];
                migrated = true;
            }
        });

        if (migrated) {
            localStorage.setItem(fincasKey, JSON.stringify(fincas));
            console.log('Farms migrated with new feeding fields');
        }
    }

    // Run migration
    migrateFarms();
});
