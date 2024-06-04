document.addEventListener('DOMContentLoaded', () => {
    const fileUpload = document.getElementById('file-upload');
    const chartDiv = document.getElementById('chart');
    const pointsInfoDiv = document.getElementById('points-info');
    const carbsConsumptionEl = document.getElementById('carbs-consumption');
    const caloriesConsumptionEl = document.getElementById('calories-consumption');
    const proteinConsumptionEl = document.getElementById('protein-consumption');
    const hoursInput = document.getElementById('hours');
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    let elevationData = [];
    let points = [];

    const nutritionData = [
        { name: "Purée nutritionnelle bio Baouw framboise, fraise, basilic", type: "Purée", brand: "Baouw", price: 3.25, carbs: 11, calories: 66, protein: 0.01 },
        { name: "Purée nutritionnelle bio Baouw poire, pomme, menthe", type: "Purée", brand: "Baouw", price: 2.95, carbs: 11, calories: 66, protein: 0.01 },
        { name: "Maurten Gel 100", type: "Gel", brand: "Maurten", price: 3.6, carbs: 25, calories: 100, protein: 0 },
        { name: "Maurten Gel 100 CAF", type: "Gel", brand: "Maurten", price: 4.2, carbs: 25, calories: 100, protein: 0 },
        { name: "Pâte de fruits Fruit'n Perf Bio Overstim", type: "Barre", brand: "OVERSTIMS", price: 1.65, carbs: 19, calories: 77, protein: 0.5 },
        { name: "Gaufre énergétique Näak Ultra Energy saveur chocolat", type: "Barre", brand: "Naak", price: 2.25, carbs: 17, calories: 140, protein: 3 },
        { name: "Gaufre énergétique Näak Ultra Energy saveur sirop erable", type: "Barre", brand: "Naak", price: 2.25, carbs: 17, calories: 140, protein: 3 },
    ];

    fileUpload.addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const xml = new DOMParser().parseFromString(e.target.result, "application/xml");
            parseGPX(xml);
            drawChart();
        };
        reader.readAsText(file);
    }

    function parseGPX(xml) {
        elevationData = [];
        points = [];
        const trkpts = xml.getElementsByTagName("trkpt");
        let prevLat = null;
        let prevLon = null;
        let distance = 0;

        for (let i = 0; i < trkpts.length; i++) {
            const lat = parseFloat(trkpts[i].getAttribute("lat"));
            const lon = parseFloat(trkpts[i].getAttribute("lon"));
            const ele = parseFloat(trkpts[i].getElementsByTagName("ele")[0].textContent);

            if (prevLat !== null && prevLon !== null) {
                distance += haversine(prevLat, prevLon, lat, lon);
            }

            elevationData.push({ distance, elevation: ele });

            prevLat = lat;
            prevLon = lon;
        }
    }

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function drawChart() {
        chartDiv.innerHTML = '';

        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const x = d3.scaleLinear().domain(d3.extent(elevationData, d => d.distance)).range([0, width]);
        const y = d3.scaleLinear().domain([d3.min(elevationData, d => d.elevation) - 10, d3.max(elevationData, d => d.elevation) + 10]).range([height, 0]);

        const line = d3.line()
            .x(d => x(d.distance))
            .y(d => y(d.elevation));

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.append("path")
            .datum(elevationData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.selectAll("dot")
            .data(points)
            .enter().append("circle")
            .attr("r", 5)
            .attr("cx", d => x(d.distance))
            .attr("cy", d => y(d.elevation))
            .style("fill", "orange")
            .on("click", function(event, d) {
                removePoint(d.distance);
            });

        svg.on("click", function(event) {
            const [mx, my] = d3.pointer(event);
            const distance = x.invert(mx);
            addPoint(distance);
        });
    }

    function addPoint(distance) {
        const nearest = elevationData.reduce((prev, curr) => (Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev));
        points.push(nearest);
        points.sort((a, b) => a.distance - b.distance);
        updatePointsInfo();
        updateAverageConsumption();
        drawChart();
    }

    function removePoint(distance) {
        points = points.filter(p => p.distance !== distance);
        updatePointsInfo();
        updateAverageConsumption();
        drawChart();
    }

    function updatePointsInfo() {
        pointsInfoDiv.innerHTML = '';

        const totalTime = getTotalTime();

        points.forEach(point => {
            const pointDiv = document.createElement('div');
            pointDiv.className = 'point-info';

            const pointHeader = document.createElement('div');
            pointHeader.className = 'point-header';

            const timeEstimate = getTimeEstimate(point.distance, totalTime);
            const pointText = document.createElement('span');
            pointText.textContent = `Km: ${point.distance.toFixed(2)}, Elevation: ${point.elevation.toFixed(2)}m, Time: ${formatTime(timeEstimate)}`;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => removePoint(point.distance);

            pointHeader.appendChild(pointText);
            pointHeader.appendChild(removeButton);

            const nutritionSelectDiv = document.createElement('div');
            nutritionSelectDiv.className = 'nutrition-select';

            const nutritionLabel = document.createElement('label');
            nutritionLabel.textContent = 'Add Food: ';

            const nutritionSelect = document.createElement('select');

            nutritionData.forEach(food => {
                const option = document.createElement('option');
                option.value = food.name;
                option.textContent = `${food.name} (${food.brand})`;
                nutritionSelect.appendChild(option);
            });

            const addFoodButton = document.createElement('button');
            addFoodButton.textContent = 'Add';
            addFoodButton.onclick = () => addFood(point.distance, nutritionSelect.value);

            nutritionSelectDiv.appendChild(nutritionLabel);
            nutritionSelectDiv.appendChild(nutritionSelect);
            nutritionSelectDiv.appendChild(addFoodButton);

            const nutritionList = document.createElement('div');
            nutritionList.className = 'nutrition-list';
            nutritionList.id = `nutrition-list-${point.distance}`;

            pointDiv.appendChild(pointHeader);
            pointDiv.appendChild(nutritionSelectDiv);
            pointDiv.appendChild(nutritionList);
            pointsInfoDiv.appendChild(pointDiv);
        });
    }

    function addFood(distance, foodName) {
        const point = points.find(p => p.distance === distance);
        if (!point.foods) point.foods = [];

        const food = nutritionData.find(f => f.name === foodName);
        point.foods.push(food);

        updateNutritionList(distance);
        updateAverageConsumption();
    }

    function removeFood(distance, foodName) {
        const point = points.find(p => p.distance === distance);
        point.foods = point.foods.filter(f => f.name !== foodName);

        updateNutritionList(distance);
        updateAverageConsumption();
    }

    function updateNutritionList(distance) {
        const point = points.find(p => p.distance === distance);
        const nutritionList = document.getElementById(`nutrition-list-${distance}`);
        nutritionList.innerHTML = '';

        point.foods.forEach(food => {
            const foodItem = document.createElement('div');
            foodItem.className = 'nutrition-item';

            const foodText = document.createElement('span');
            foodText.textContent = `${food.name} (${food.brand})`;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => removeFood(distance, food.name);

            foodItem.appendChild(foodText);
            foodItem.appendChild(removeButton);
            nutritionList.appendChild(foodItem);
        });
    }

    function updateAverageConsumption() {
        let totalCarbs = 0;
        let totalCalories = 0;
        let totalProteins = 0;
        const totalTime = getTotalTime();

        points.forEach(point => {
            if (point.foods && point.foods.length > 0) {
                point.foods.forEach(food => {
                    totalCarbs += food.carbs;
                    totalCalories += food.calories;
                    totalProteins += food.protein;
                });
            }
        });

        const avgCarbs = totalTime ? totalCarbs / totalTime : 0;
        const avgCalories = totalTime ? totalCalories / totalTime : 0;
        const avgProteins = totalTime ? totalProteins / totalTime : 0;

        carbsConsumptionEl.textContent = `Glucides: Moyenne par heure: ${avgCarbs.toFixed(2)}g, Total: ${totalCarbs.toFixed(2)}g`;
        caloriesConsumptionEl.textContent = `Calories: Moyenne par heure: ${avgCalories.toFixed(2)} Kcal, Total: ${totalCalories.toFixed(2)} Kcal`;
        proteinConsumptionEl.textContent = `Protéines: Moyenne par heure: ${avgProteins.toFixed(2)}g, Total: ${totalProteins.toFixed(2)}g`;
    }

    function getTotalTime() {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        return hours + minutes / 60 + seconds / 3600;
    }

    function getTimeEstimate(distance, totalTime) {
        const totalDistance = d3.max(elevationData, d => d.distance);
        return (distance / totalDistance) * totalTime;
    }

    function formatTime(time) {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        const seconds = Math.floor(((time - hours) * 60 - minutes) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
});
