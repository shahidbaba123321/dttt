class PricingManager {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.init();
    }

    async init() {
        await this.loadPlans();
        this.setupEventListeners();
    }

    async loadPlans() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/plans`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            this.renderPlans(data.data);
        } catch (error) {
            console.error('Error loading plans:', error);
            alert('Failed to load plans. Please try again later.');
        }
    }

    renderPlans(plans) {
        const planList = document.getElementById('planList');
        planList.innerHTML = '';

        plans.forEach(plan => {
            const planCard = document.createElement('div');
            planCard.className = 'plan-card';
            planCard.innerHTML = `
                <div class="plan-title">${plan.name}</div>
                <div class="plan-price">$${plan.monthlyPrice} / month</div>
                <div class="plan-description">${plan.description}</div>
                <button class="button" onclick="pricingManager.editPlan('${plan._id}')">Edit</button>
                <button class="button" onclick="pricingManager.deletePlan('${plan._id}')">Delete</button>
            `;
            planList.appendChild(planCard);
        });
    }

    async createPlan() {
        const planData = {
            name: prompt('Enter plan name:'),
            description: prompt('Enter plan description:'),
            monthlyPrice: parseFloat(prompt('Enter monthly price:')),
            annualPrice: parseFloat(prompt('Enter annual price:')),
            features: prompt('Enter features (comma separated):').split(',').map(f => f.trim())
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/plans`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });

            const data = await response.json();
                        if (!data.success) throw new Error(data.message);

            alert('Plan created successfully!');
            this.loadPlans(); // Reload the plans to reflect the new addition
        } catch (error) {
            console.error('Error creating plan:', error);
            alert('Failed to create plan. Please try again later.');
        }
    }

    async editPlan(planId) {
        const planData = {
            name: prompt('Enter new plan name:'),
            description: prompt('Enter new plan description:'),
            monthlyPrice: parseFloat(prompt('Enter new monthly price:')),
            annualPrice: parseFloat(prompt('Enter new annual price:')),
            features: prompt('Enter new features (comma separated):').split(',').map(f => f.trim())
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            alert('Plan updated successfully!');
            this.loadPlans(); // Reload the plans to reflect the changes
        } catch (error) {
            console.error('Error updating plan:', error);
            alert('Failed to update plan. Please try again later.');
        }
    }

    async deletePlan(planId) {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/plans/${planId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            alert('Plan deleted successfully!');
            this.loadPlans(); // Reload the plans to reflect the deletion
        } catch (error) {
            console.error('Error deleting plan:', error);
            alert('Failed to delete plan. Please try again later.');
        }
    }

    setupEventListeners() {
        const createPlanButton = document.getElementById('createPlanButton');
        createPlanButton.addEventListener('click', () => this.createPlan());
    }
}

// Initialize the Pricing Manager
const apiBaseUrl = 'https://18.215.160.136.nip.io/api'; // Update with your API base URL
const pricingManager = new PricingManager(apiBaseUrl);
