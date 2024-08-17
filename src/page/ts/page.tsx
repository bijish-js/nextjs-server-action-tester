"use client";
import { useEffect, useState } from 'react';
import styles from './actions.module.css';



export default function ServerActions() {
	const [actions, setActions] = useState([]);
	const [searchableActions, setSearchableActions] = useState([]);
	const [selectedAction, setSelectedAction] = useState(null);
	const [args, setArgs] = useState({});
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);
	const [isActionsLoading, setIsActionsLoading] = useState(false);
	const [isActionExecuting, setIsActionExecuting] = useState(false);
	const [isDarkMode, setDarkMode] = useState(false);
	const [searchInput, setSearchInput] = useState('')

	const changeThemeMode = () => {
		setDarkMode(prev => {
			const newMode = !prev;
			localStorage.setItem('actionsScanDarkMode', newMode.toString());
			return newMode;
		});
	};

	const handleSearchChange = (e: any) => {
		setSearchInput(e.target.value)


		const newsearchableActions = actions.filter((action: any) => {
			return action.name.toLowerCase().includes(e.target.value.toLowerCase())
		})

		setSearchableActions(newsearchableActions)
	}

	useEffect(() => {
		setDarkMode(localStorage?.getItem('actionsScanDarkMode') === 'true');
	}, []);

	useEffect(() => {
		document.body.style.margin = "0px";

		return () => {
			document.body.style.margin = "auto";
		};
	}, [isDarkMode]);

	useEffect(() => {
		const fetchActions = async () => {
			try {
				setIsActionsLoading(true);
				const res = await fetch('/{ACTIONS_PATH_FILENAME}.json');
				const data = await res.json();
				setActions(data);
				setSearchableActions(data)
			} catch (err) {
				console.error('Failed to fetch actions:', err);
				setError("Failed to fetch actions");
			} finally {
				setIsActionsLoading(false);
			}
		};
		fetchActions();
	}, []);

	useEffect(() => {
		if (selectedAction) {
			const initialArgs = selectedAction.typeInfo.parameters.reduce((acc, param) => {
				acc[param.name] = ''; // Default empty value for each parameter
				return acc;
			}, {});
			setArgs(initialArgs);
		}
	}, [selectedAction]);

	const handleTestAction = async (e) => {
		e.preventDefault()
		setResult(null);
		setError(null);

		try {
			if (!selectedAction) {
				setError("No action selected");
				return;
			}
			setIsActionExecuting(true);

			// Prepare arguments
			const preparedArgs = Object.entries(args).map(([key, value]) => {
				if (value === 'true') return true;
				if (value === 'false') return false;
				try {
					return JSON.parse(value); // Parse JSON strings
				} catch {
					return value; // If not JSON, keep as string
				}
			});

			const dataToSend = JSON.stringify({
				actionPath: selectedAction.path,
				functionName: selectedAction.name,
				id: selectedAction?.id,
				args: preparedArgs,
			});

			const res = await fetch('/api/{API_NAME}', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: dataToSend,
			});
			const data = await res.json();
			if (res.ok) {
				setResult(data.result);
			} else {
				setError(data.error);
				throw new Error('Network response was not ok');

			}
		} catch (err) {
			setError(err.message);
		} finally {
			setIsActionExecuting(false);
		}
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setArgs(prevArgs => ({ ...prevArgs, [name]: value }));

	};
	const changeThemeViaKeyboard = (e: any) => {
		if (e.key === 'enter' || e.key === '') {
			changeThemeMode()
		}
	}

	const readableType = (type: string) => {
		if (type === 'TSBooleanKeyword') return 'boolean'
		if (type === 'TSStringKeyword') return 'string'
		if (type === 'TSNumberKeyword') return 'number'
		if (type === 'TSObjectKeyword') return 'object'
		if (type === 'TSAnyKeyword') return 'any'
		return type
	}
	return (
		<div className={` ${styles.container} ${isDarkMode === true ? styles.darkContainer : styles.lightContainer}`}>

			<div className={` ${styles.boxShadowHeader}`}>
				<div className={`${styles.spaceContainer}  ${styles.header}`}>

					<h1 className={`${styles.topHeading} ${isDarkMode === true ? styles.topHeadingDark : styles.topHeadingLight}`}>Next.js Server Actions</h1>


					<button type="button" className={styles.darkMode} onClick={changeThemeMode} onKeyUp={changeThemeViaKeyboard}>
						<input type="checkbox"
							id="darkModeToggle"
							className={styles.darkModeInput}
							onChange={changeThemeMode}
							checked={isDarkMode}
						/>
						<label htmlFor="darkModeToggle" className={styles.darkModeLabel}>

						</label>
					</button>
				</div>
			</div>



			<div className={`${styles.contentWrap} ${styles.spaceContainer} ${isDarkMode ? styles.darkContentWrap : styles.lightContentWrap}`}>

				<div className={`${styles.actionSelector} ${isDarkMode ? styles.darkActionSelector : styles.lightActionSelector}`}>


					{isActionsLoading ?
						<div className={styles.actionsLoader}><svg
							aria-hidden="true"
							role="status"
							width="32px"
							height="32px"
							viewBox="0 0 100 101"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className={styles.spinner}
						>
							<path
								d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
								fill="#E5E7EB"
							/>
							<path
								d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
								fill="currentColor"
							/>
						</svg></div> : null}
					{!isActionsLoading && actions?.length > 0 ? (
						<>

							<input type="text" placeholder="🔍  Search action" value={searchInput} onChange={handleSearchChange} className={`${styles.actionNameInput}  ${isDarkMode ? styles.darkActionNameInput : styles.lightSelectActionLabel}`} />

							<div className={`${styles.actionsList}`}>

								{searchableActions?.map((action, index) => (
									<button type="button" key={action?.id} value={index} className={`${styles.actionRow} ${action?.id === selectedAction?.id ? styles.actionRowSelected : ""}`} onClick={() => {
										setResult(null);
										setError(null);
										setSelectedAction(action)
									}} >
										{action.name}
									</button>
								))}
							</div>	</>
					) : null}
					{!isActionsLoading && actions?.length === 0 ? <p className={styles.pre}>No actions found 🙁</p> : null}



				</div>


				<div className={`${styles.actionPerformer} ${isDarkMode ? styles.darkActionPerformer : styles.lightActionPerformer}`}>

					{selectedAction ? (<>
						<div className={`${styles.actionDetails}`}>
							<p className={`${styles.actionName} ${isDarkMode ? styles.darkActionName : styles.lightActionName}`}>{selectedAction?.name}</p>
							<p className={`${styles.actionPath} ${isDarkMode ? styles.darkActionPath : styles.lightActionPath}`}>{selectedAction?.path}</p>
						</div>

						<div className={styles.separator} />

						<div className={styles.parametersContainer}>
							<p className={`${styles.parametersText} ${isDarkMode ? styles.darkParametersText : styles.lightParametersText}`}>Parameters</p>
							<div className={styles.parametersWrap}>
								{selectedAction.typeInfo.parameters.map((param, index) => (
									<div key={index} className={styles.parameterField}>

										<div className={styles.parameterFieldHeader}>
											<span className={styles.paramName} >{param.name}</span>:
											<span className={styles.paramType}>{readableType(param?.type)}</span>{" "}
										</div>


										<textarea

											name={param.name}
											value={args[param.name] || ''}
											onChange={handleChange}
											className={`${styles.textarea} ${isDarkMode ? styles.darkTextarea : ""}`}

										/>
									</div>
								))}
							</div>
						</div>

						<div className={styles.separator} />

						<div>
							<button className={`${styles.executeButton} ${isActionExecuting ? styles.disabled : null}`} onClick={handleTestAction} disabled={isActionExecuting}>
								Execute {isActionExecuting ?

									<svg
										aria-hidden="true"
										role="status"
										width="16px"
										height="16px"
										viewBox="0 0 100 101"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className={styles.spinner}
									>
										<path
											d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
											fill="#E5E7EB"
										/>
										<path
											d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
											fill="currentColor"
										/>
									</svg> : ""}
							</button>
							{result && <pre className={styles.pre}>{JSON.stringify(result, null, 2)}</pre>}
							{error && <pre className={styles.error}>{error}</pre>}
						</div>
					</>) :
						<p className={styles.pre}>No action selected 🙂</p>}

				</div>
			</div>
		</div >
	)

}

