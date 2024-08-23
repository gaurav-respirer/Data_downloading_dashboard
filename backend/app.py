import pandas as pd
from tqdm import tqdm
import time
from datetime import datetime, timedelta
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from io import BytesIO
from flask import send_file

# Initialize Flask app
app = Flask(__name__)
CORS(app)  

# Define API credentials
API_key = "qc_airview"
username = "atmos_api_auth_user"
password = "uGftSxz218Abv"

# Define date range
start_date = "2024-07-22"
end_date = "2024-07-23"

# Function to fetch data with retries
def fetch_data_with_retry(url, final_params, retries=100, delay=1):
    for attempt in range(retries):
        try:
            df = pd.read_csv(url)
            if df.empty:
                raise ValueError("DataFrame is empty")
            if not all(col in df.columns for col in final_params):
                raise ValueError(f"DataFrame missing expected columns. Columns present: {df.columns}")
            if attempt == 0:
                pass
            else:
                print(f"Data fetched successfully on attempt {attempt + 1}")
            return df
        except ValueError as ve:
            print(f"Attempt {attempt + 1} failed due to empty DataFrame. Error: {ve}")
            if attempt < retries - 1:
                print("Retrying...")
                time.sleep(delay)
        except Exception as e:
            print(f"Attempt {attempt + 1} failed. Error: {e}")
            if attempt < retries - 1:
                print("Retrying...")
                time.sleep(delay)
    raise RuntimeError(f"Failed after {retries} attempts")

# Function to fetch IMEI data
def fetch_imei_data(imeis, start_date_dt, end_date_dt):
    params_required = ["pm2.5cnc", "pm10cnc", "temp", "humidity", "so2op1", "so2op2", "o3op1", "o3op2"]
    final_params = ['dt_time'] + params_required + ['deviceid']
    df_dict = {}

    total_imeis = len(imeis)
    for j, imei in enumerate(imeis):
        print(f"Processing IMEI: {j + 1}/{total_imeis}")
        all_data = []
        current_date = start_date_dt
        total_days = (end_date_dt - start_date_dt).days + 1
        with tqdm(total=total_days, desc=f"Processing IMEI {imei}", leave=False) as pbar:
            while current_date <= end_date_dt:
                next_date = current_date + timedelta(days=1)
                url = f"https://atmos.urbansciences.in/adp/v4/getDeviceDataParam/imei/{imei}/params/" + ','.join(params_required) + "/"
                url += f'startdate/{current_date.strftime("%Y-%m-%dT00:00")}/enddate/{current_date.strftime("%Y-%m-%dT23:59")}/'
                url += f'ts/mm/avg/1/api/B2zL7G?gaps=1&gap_value=NULL'
                df = fetch_data_with_retry(url, final_params)
                df.drop(columns=["deviceid"], inplace=True)
                all_data.append(df)
                current_date = next_date
                pbar.update(1)
        df_dict[f"{imei}"] = pd.concat(all_data, ignore_index=True)

    return df_dict

# Function to fetch user data (projects)
def fetch_user_data(url, auth):
    return requests.get(url, auth=auth)

# Function to fetch parameters from an API
def fetch_parameters():
    url = "http://atmos.urbansciences.in:7070/api/v1/metricnames"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json().get("results", [])
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch parameters: {e}")
        return []


@app.route('/parameters', methods=['GET'])
def get_parameters():
    def fetch_user_data(url):
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json().get("results", [])
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return []

    url = "http://atmos.urbansciences.in:7070/api/v1/metricnames"
    parameters = fetch_user_data(url)

    if parameters:
        return jsonify(parameters)
    else:
        return jsonify({"error": "Failed to retrieve parameters"}), 500

# Endpoint to get project names
@app.route('/projects', methods=['GET'])
def get_projects():
    url = "https://atmos.urbansciences.in/adp/v4/users"
    response = fetch_user_data(url, auth=(username, password))
    
    if response.status_code == 200:
        data = response.json()
        projects = [user["username"] for user in data]
        return jsonify(projects)
    else:
        return jsonify({"error": "Failed to retrieve projects"}), response.status_code

# Function to get IMEIs by project
def get_imeis_by_project(project):
    url = f"https://atmos.urbansciences.in/adp/v4/check_user_imei/user/{project}"
    max_retries = 15
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                json_data = response.json()
                if "imei_details" in json_data and len(json_data["imei_details"]) > 0:
                    imeis_list = [imei_detail["imei"] for imei_detail in json_data["imei_details"]]
                    print(f"IMEIs fetched successfully for project: {project}")
                    return imeis_list
                else:
                    print("IMEI details are missing or empty in the response")
            else:
                print(f"Unable to fetch data. Status Code: {response.status_code}")
            time.sleep(retry_delay)
        except requests.RequestException as e:
            print(f"An error occurred: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Exiting.")
                return None

    return None

# Endpoint to get IMEIs by project
@app.route('/imeis', methods=['GET'])
def get_imeis():
    project_name = request.args.get('project')
    if not project_name:
        return jsonify({"error": "Project name is required"}), 400
    
    imeis_list = get_imeis_by_project(project_name)
    if imeis_list is not None:
        return jsonify(imeis_list)
    else:
        return jsonify({"error": "Failed to retrieve IMEIs"}), 500


@app.route('/download', methods=['GET'])
def download_file():
  # Simulate file generation process
  time.sleep(2)  # Simulate a delay
  data = "This is the content of your file.".encode('utf-8')
  buffer = BytesIO()
  buffer.write(data)
  buffer.seek(0)
  
  return send_file(
      buffer,
      as_attachment=True,
      download_name='data_fetcher_for_dashboard.txt',
      mimetype='text/plain'
  )

if __name__ == '__main__':
    app.run(debug=True)
