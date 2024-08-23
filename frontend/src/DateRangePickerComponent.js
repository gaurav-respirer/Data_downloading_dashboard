import React from 'react';

const DateRangePickerComponent = ({ onDateRangeChange }) => {
  const handleDateRangeChange = (e) => {
    const startDate = new Date(e.target.elements.startDate.value);
    const endDate = new Date(e.target.elements.endDate.value);
    onDateRangeChange({ startDate, endDate });
  };

  return (
    <form onSubmit={handleDateRangeChange}>
      <label>
        Start Date:
        <input type="date" name="startDate" />
      </label>
      <label>
        End Date:
        <input type="date" name="endDate" />
      </label>
      <button type="submit">Set Date Range</button>
    </form>
  );
};

export default DateRangePickerComponent;
