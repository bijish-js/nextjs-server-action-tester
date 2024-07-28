"use client"
import { useEffect, useState } from 'react';
import styles from './actions.module.css';

export default function ServerActions() {
	const [actions, setActions] = useState([]);
	const [selectedAction, setSelectedAction] = useState(null);
	const [args, setArgs] = useState('');
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);

	const [isActionsLoading, setIsActionsLoading] = useState(false)
	const [isActionExecuting, setIsActionExecuting] = useState(false)
	useEffect(() => {
		const fetchActions = async () => {
			try {
				setIsActionsLoading(true)
				const res = await fetch('/serverActions.json');
				const data = await res.json();
				setActions(data);
			} catch (err) {
				console.error('Failed to fetch actions:', err);
				setError("Failed to fetch actions");

			}
			finally {
				setIsActionsLoading(false)

			}
		};

		fetchActions();
	}, []);

	const handleTestAction = async () => {
		setResult(null);
		setError(null);

		try {
			if (!selectedAction) {
				setError("No action selected");
				return
			}
			setIsActionExecuting(true)
			const dataToSend = JSON.stringify({
				actionPath: selectedAction.path,
				functionName: selectedAction.name,
				id: selectedAction?.id,
				args: args ? JSON.parse(args) : null,
			});
			const res = await fetch('{API_PATH}', {
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
			}
		} catch (err) {
			setError(err.message);
		}
		finally {
			setIsActionExecuting(false)

		}
	};

	return (
		<div className={styles.container}>
			<h1 className={styles.title}>Server Actions Dashboard</h1>
			{isActionsLoading ? <p className={styles.pre}>Loading...</p> : null}
			{!isActionsLoading && actions?.length > 0 ? <select
				className={styles.select}
				onChange={(e) => setSelectedAction(actions[e.target.value])}
				disabled={isActionExecuting}
			>
				<option>Select an action</option>
				{actions.map((action, index) => (
					<option key={index} value={index}>
						{action.name} ({action.path})
					</option>
				))}
			</select> : null}
			{!isActionsLoading && actions?.length === 0 ? <p className={styles.pre}>No actions found</p> : null}
			<textarea
				className={styles.textarea}
				placeholder="Arguments as JSON array"
				value={args}
				onChange={(e) => setArgs(e.target.value)}
				disabled={isActionExecuting}

			/>
			<button className={`${styles.button} ${isActionExecuting ? styles.buttonDisabled : null}`} onClick={handleTestAction} disabled={isActionExecuting}>Test Action {isActionExecuting ? "..." : ""}</button>
			{result && <pre className={styles.pre}>{JSON.stringify(result, null, 2)}</pre>}
			{error && <pre className={styles.error}>{error}</pre>}
		</div>
	);
}


