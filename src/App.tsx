import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import {Auth} from "aws-amplify";
import {Authenticator} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import awsExports from "./aws-exports";
import "./App.css"; // Update this with custom styles
import HomePage from "./pages/home";
import {GlobalProvider} from "./provider/GlobalContext";

Auth.configure(awsExports);

function App() {
	return (
		<Router>
			<Authenticator
				loginMechanisms={["email"]}
				formFields={{
					signUp: {
						email: {order: 1, isRequired: true},
						name: {order: 2, isRequired: true},
						password: {order: 3},
						confirm_password: {order: 4},
					},
				}}
			>
				{() => (
					<>
						<Routes>
							<Route
								path='/'
								element={
									<GlobalProvider>
										<HomePage />
									</GlobalProvider>
								}
							/>
						</Routes>
					</>
				)}
			</Authenticator>
		</Router>
	);
}

export default App;
