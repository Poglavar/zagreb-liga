(function attachNumbeoMetricData(globalObject) {
    const ITEM_VARIANTS_BY_ITEM = Object.freeze({
        '1 Bedroom Apartment in City Centre': Object.freeze({ canonicalItem: 'Apartment (1 bedroom) in City Centre', valueMultiplier: 1 }),
        '1 Bedroom Apartment Outside of Centre': Object.freeze({ canonicalItem: 'Apartment (1 bedroom) Outside of Centre', valueMultiplier: 1 }),
        '1 Bedroom Apartment Outside of City Centre': Object.freeze({ canonicalItem: 'Apartment (1 bedroom) Outside of Centre', valueMultiplier: 1 }),
        'Price per Square Feet to Buy Apartment in City Centre': Object.freeze({ canonicalItem: 'Price per Square Meter to Buy Apartment in City Centre', valueMultiplier: 10.763910416709722 }),
        'Price per Square Feet to Buy Apartment Outside of Centre': Object.freeze({ canonicalItem: 'Price per Square Meter to Buy Apartment Outside of Centre', valueMultiplier: 10.763910416709722 }),
        'Price per Square Meter to Buy an Apartment in the City Centre': Object.freeze({ canonicalItem: 'Price per Square Meter to Buy Apartment in City Centre', valueMultiplier: 1 }),
        'Price per Square Meter to Buy an Apartment Outside of the Centre': Object.freeze({ canonicalItem: 'Price per Square Meter to Buy Apartment Outside of Centre', valueMultiplier: 1 }),
        'Basic (Electricity, Heating, Cooling, Water, Garbage) for 915 sq ft Apartment': Object.freeze({ canonicalItem: 'Basic Utilities for 85m2 Apartment', valueMultiplier: 1 }),
        'Basic Utilities for 915 Square Feet Apartment (Electricity, Heating, Cooling, Water, Garbage)': Object.freeze({ canonicalItem: 'Basic Utilities for 85m2 Apartment', valueMultiplier: 1 }),
        'Basic Utilities for 915 sq ft Apartment Including Electricity, Heating, Cooling, Water, and Garbage': Object.freeze({ canonicalItem: 'Basic Utilities for 85m2 Apartment', valueMultiplier: 1 }),
        'Broadband Internet (Unlimited Data, 60 Mbps or Higher)': Object.freeze({ canonicalItem: 'Internet (60 Mbps or More, Unlimited Data, Cable/ADSL)', valueMultiplier: 1 }),
        'Internet (60 Mbps or More, Unlimited Data, Cable/ADSL/5G)': Object.freeze({ canonicalItem: 'Internet (60 Mbps or More, Unlimited Data, Cable/ADSL)', valueMultiplier: 1 }),
        'One-Way Ticket (Local Transport)': Object.freeze({ canonicalItem: 'One-way Ticket (Local Transport)', valueMultiplier: 1 }),
        'One-Way Ticket on Local Transport': Object.freeze({ canonicalItem: 'One-way Ticket (Local Transport)', valueMultiplier: 1 }),
        'Gasoline (1 Liter)': Object.freeze({ canonicalItem: 'Gasoline (1 liter)', valueMultiplier: 1 }),
        'Gasoline (1 gallon)': Object.freeze({ canonicalItem: 'Gasoline (1 liter)', valueMultiplier: 1 / 3.785411784 }),
        'Annual Mortgage Interest Rate (20-Year Fixed, in %)': Object.freeze({ canonicalItem: 'Mortgage Interest Rate in Percentages (%), Yearly, for 20 Years Fixed-Rate', valueMultiplier: 1 }),
        'Mortgage Interest Rate for 20 Years, Yearly, Fixed-Rate': Object.freeze({ canonicalItem: 'Mortgage Interest Rate in Percentages (%), Yearly, for 20 Years Fixed-Rate', valueMultiplier: 1 }),
        'Meal at an Inexpensive Restaurant': Object.freeze({ canonicalItem: 'Meal, Inexpensive Restaurant', valueMultiplier: 1 })
    });

    const BASE_METRICS = [
        Object.freeze({ key: 'salary_net', label: 'Neto plaća', better: 'higher', format: 'currency', canonicalItem: 'Average Monthly Net Salary (After Tax)' }),
        Object.freeze({ key: 'rent_1br_center', label: 'Najam 1-sobni centar', better: 'lower', format: 'currency', canonicalItem: 'Apartment (1 bedroom) in City Centre' }),
        Object.freeze({ key: 'rent_1br_outside', label: 'Najam 1-sobni izvan centra', better: 'lower', format: 'currency', canonicalItem: 'Apartment (1 bedroom) Outside of Centre' }),
        Object.freeze({ key: 'buy_m2_center', label: 'Kupnja m2 u centru', better: 'lower', format: 'currency', canonicalItem: 'Price per Square Meter to Buy Apartment in City Centre' }),
        Object.freeze({ key: 'buy_m2_outside', label: 'Kupnja m2 izvan centra', better: 'lower', format: 'currency', canonicalItem: 'Price per Square Meter to Buy Apartment Outside of Centre' }),
        Object.freeze({ key: 'meal_inexpensive', label: 'Obrok u restoranu', better: 'lower', format: 'currency', canonicalItem: 'Meal, Inexpensive Restaurant' }),
        Object.freeze({ key: 'utilities_85m2', label: 'Režije za 85m2', better: 'lower', format: 'currency', canonicalItem: 'Basic Utilities for 85m2 Apartment' }),
        Object.freeze({ key: 'internet', label: 'Internet', better: 'lower', format: 'currency', canonicalItem: 'Internet (60 Mbps or More, Unlimited Data, Cable/ADSL)' }),
        Object.freeze({ key: 'local_ticket', label: 'Karta lokalnog prijevoza', better: 'lower', format: 'currency', canonicalItem: 'One-way Ticket (Local Transport)' }),
        Object.freeze({ key: 'gasoline_liter', label: 'Gorivo po litri', better: 'lower', format: 'currency', canonicalItem: 'Gasoline (1 liter)' }),
        Object.freeze({ key: 'mortgage_rate', label: 'Kamata na kredit', better: 'lower', format: 'percent', canonicalItem: 'Mortgage Interest Rate in Percentages (%), Yearly, for 20 Years Fixed-Rate' })
    ];

    const DERIVED_METRICS = Object.freeze([
        Object.freeze({ key: 'salary_after_rent_center', label: 'Plaća nakon najma u centru', better: 'higher', format: 'currency' }),
        Object.freeze({ key: 'salary_after_rent_outside', label: 'Plaća nakon najma izvan centra', better: 'higher', format: 'currency' }),
        Object.freeze({ key: 'rent_burden_center', label: 'Udio najma u plaći, centar', better: 'lower', format: 'percent' }),
        Object.freeze({ key: 'rent_burden_outside', label: 'Udio najma u plaći, izvan centra', better: 'lower', format: 'percent' }),
        Object.freeze({ key: 'buy_m2_salary_ratio_center', label: 'Mjesečne plaće za 1 m2 u centru', better: 'lower', format: 'number' }),
        Object.freeze({ key: 'buy_m2_salary_ratio_outside', label: 'Mjesečne plaće za 1 m2 izvan centra', better: 'lower', format: 'number' })
    ]);

    function buildMetricItems(canonicalItem) {
        const items = Object.entries(ITEM_VARIANTS_BY_ITEM)
            .filter(([, details]) => details.canonicalItem === canonicalItem)
            .map(([item]) => item);

        if (!items.includes(canonicalItem)) {
            items.unshift(canonicalItem);
        }

        return Object.freeze(items);
    }

    const METRICS = Object.freeze(BASE_METRICS.map(metric => Object.freeze({
        ...metric,
        items: buildMetricItems(metric.canonicalItem)
    })));

    globalObject.NUMBEO_METRIC_DATA = Object.freeze({
        itemVariantsByItem: ITEM_VARIANTS_BY_ITEM,
        metrics: METRICS,
        derivedMetrics: DERIVED_METRICS
    });
})(globalThis);