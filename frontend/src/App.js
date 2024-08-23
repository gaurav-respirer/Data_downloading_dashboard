import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './logo.png';
import DateRangePickerComponent from './DateRangePickerComponent';
import axios from 'axios';

function App() {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [imeis, setImeis] = useState({});
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedImeis, setSelectedImeis] = useState([]);
  const [currentProject, setCurrentProject] = useState('');
  const [timeStep, setTimeStep] = useState('Hours');
  const [parameter, setParameter] = useState('');
  const [parameters, setParameters] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [averagingPeriod, setAveragingPeriod] = useState('1');// eslint-disable-next-line
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedTimeRanges, setSelectedTimeRanges] = useState([]);
  const [selectedTimeCriteria, setSelectedTimeCriteria] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchParameters();
  }, []);

  useEffect(() => {
    if (projectName && !selectedProjects.includes(projectName)) {
      const updatedProjects = [...selectedProjects, projectName];
      setSelectedProjects(updatedProjects);
      fetchImeis(updatedProjects);
    }// eslint-disable-next-line
  }, [projectName]);

  useEffect(() => {
    if (currentProject) {
      setSelectedImeis(prevImeis =>
        prevImeis.filter(imei => (imeis[currentProject] || []).includes(imei))
      );
    }
  }, [currentProject, imeis]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchParameters = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/parameters');
      const data = await response.json();
      setParameters(data);
    } catch (error) {
      console.error('Error fetching parameters:', error);
    }
  };

  const fetchImeis = async (projects) => {
    try {
      const imeisFromProjects = await Promise.all(
        projects.map(async (project) => {
          const response = await fetch(`http://127.0.0.1:5000/imeis?project=${project}`);
          const data = await response.json();
          const imeis = data.imei_details.map((detail) => detail.imei); // Adjust if needed
          return { project, imeis };
        })
      );
      const imeisMap = imeisFromProjects.reduce((acc, { project, imeis }) => {
        acc[project] = imeis;
        return acc;
      }, {});
      setImeis(imeisMap);
    } catch (error) {
      console.error('Error fetching IMEIs:', error);
    }
  };

  const handleProjectNameChange = (event) => {
    setProjectName(event.target.value);
  };

  const handleProjectClick = (event) => {
    const project = event.target.value;
    setCurrentProject(project);
  };

  const handleImeiChange = (event) => {
    const selectedOptions = [...event.target.selectedOptions].map(option => option.value);
    setSelectedImeis(prevImeis => {
      const newImeis = new Set([...prevImeis, ...selectedOptions]);
      return Array.from(newImeis);
    });
  };

  const handleTimeStepChange = (event) => {
    const selectedValue = event.target.value;
    setTimeStep(selectedValue);
    setSelectedTimeCriteria(prevCriteria => {
      const newCriteria = new Set([...prevCriteria, selectedValue]);
      return Array.from(newCriteria);
    });
  };

  const handleParameterChange = (event) => {
    const selectedOption = event.target.value;
    setParameter(selectedOption);
    setSelectedParameters(prevParameters => {
      const newParameters = new Set([...prevParameters, selectedOption]);
      return Array.from(newParameters);
    });
  };

  const handleAveragingPeriodChange = (event) => {
    setAveragingPeriod(event.target.value);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setSelectedTimeRanges([`${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`]);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);
    console.log('Download started');

    try {
      const response = await axios.get('http://127.0.0.1:5000/download', {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const totalLength = progressEvent.lengthComputable
            ? progressEvent.total
            : progressEvent.target.getResponseHeader('content-length') || progressEvent.target.getResponseHeader('x-decompressed-content-length');
          if (totalLength) {
            setProgress(Math.round((progressEvent.loaded * 100) / totalLength));
          }
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'data_fetcher_for_dashboard.txt');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      console.log('Download completed');

    } catch (error) {
      console.error('Error during download:', error);
    }

    setIsDownloading(false);
  };

  return (
    <div className="App">
      <header className="header">
        <img src={logo} alt="Respirer Living Sciences" className="logo" />
      </header>
      <div className="form">

        {/* Project Name and Selected Projects */}
        <div className="field-group">
          <div className="field">
            <label htmlFor="projectName" className="label">Select Project Name</label>
            <select id="projectName" value={projectName} onChange={handleProjectNameChange}>
              <option value="">Select Project Name</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
          <div className="field selected-projects">
            <label className="label">Selected Project Names</label>
            <div className="selected-box">
              {selectedProjects.length > 0 ? (
                <select
                  multiple
                  className="scrollable-box"
                  value={selectedProjects}
                  onChange={handleProjectClick}
                >
                  {selectedProjects.map((project, index) => (
                    <option key={index} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No projects selected</p>
              )}
            </div>
          </div>
        </div>

        {/* IMEIs Section */}
        <div className="field-group">
          <div className="field">
            <label htmlFor="imeis" className="label">Select IMEI</label>
            <select
              id="imeis"
              multiple
              className="scrollable-box"
              value={selectedImeis}
              onChange={handleImeiChange}
            >
              {(imeis[currentProject] || []).map((imei, index) => (
                <option key={index} value={imei}>
                  {imei}
                </option>
              ))}
            </select>
          </div>
          <div className="field selected-imeis">
            <label className="label">Selected IMEIs</label>
            <div className="selected-box">
              {selectedImeis.length > 0 ? (
                <select
                  multiple
                  className="scrollable-box"
                  value={selectedImeis}
                  onChange={handleImeiChange}
                >
                  {selectedImeis.map((imei, index) => (
                    <option key={index} value={imei}>
                      {imei}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No IMEIs selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Time Step */}
        <div className="field">
          <label htmlFor="timeStep" className="label">Select Criteria</label>
          <select id="timeStep" value={timeStep} onChange={handleTimeStepChange}>
            <option value="Hours">Hours</option>
            <option value="Minutes">Minutes</option>
            <option value="Days">Days</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>

        {/* Parameter Section */}
        <div className="field-group">
          <div className="field">
            <label htmlFor="parameters" className="label">Select Parameters</label>
            <select id="parameters" value={parameter} onChange={handleParameterChange}>
              <option value="">Select Parameters</option>
              {parameters.map((param) => (
                <option key={param} value={param}>
                  {param}
                </option>
              ))}
            </select>
          </div>
          <div className="field selected-parameters">
            <label className="label">Selected Parameters</label>
            <div className="selected-box">
              {selectedParameters.length > 0 ? (
                <select
                  multiple
                  className="scrollable-box"
                  value={selectedParameters}
                  onChange={handleParameterChange}
                >
                  {selectedParameters.map((param, index) => (
                    <option key={index} value={param}>
                      {param}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No parameters selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Averaging Period */}
        <div className="field">
          <label htmlFor="averagingPeriod" className="label">Select Averaging Period</label>
          <select id="averagingPeriod" value={averagingPeriod} onChange={handleAveragingPeriodChange}>
            {Array.from({ length: 100 }, (_, i) => i + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="field">
          <label className="label">Select Time Range</label>
          <DateRangePickerComponent onDateRangeChange={handleDateRangeChange} />
        </div>

        {/* Selected Time Range */}
        <div className="field">
          <label className="label">Selected Time Range</label>
          <div className="selected-box">
            {selectedTimeRanges.length > 0 ? (
              <p>{selectedTimeRanges[0]}</p>
            ) : (
              <p>No time range selected</p>
            )}
          </div>
        </div>

        {/* Selected Time Criteria */}
        <div className="field">
          <label className="label">Selected Time Criteria</label>
          <div className="selected-box">
            {selectedTimeCriteria.length > 0 ? (
              <select
                multiple
                className="scrollable-box"
                value={selectedTimeCriteria}
                onChange={handleTimeStepChange}
              >
                {selectedTimeCriteria.map((criteria, index) => (
                  <option key={index} value={criteria}>
                    {criteria}
                  </option>
                ))}
              </select>
            ) : (
              <p>No time criteria selected</p>
            )}
          </div>
        </div>

        {/* Download Button */}
        <div>
          <h3>Download File with Progress</h3>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px',
              width: '150px',
              height: '50px'
            }}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
          {isDownloading && (
            <div style={{ marginTop: '20px', width: '300px' }}>
              <progress value={progress} max="100" style={{ width: '100%' }} />
              <p>{progress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
