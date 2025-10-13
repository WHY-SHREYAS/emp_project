pipeline {
    agent any
    
    tools {
        maven 'maven-3.9'  // Use the configured Maven installation
        nodejs 'node-18'  // Use the configured Node.js installation
    }
    
    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://http://3.109.151.67:9000'  // Your SonarQube server URL
    }
    
    stages {
        stage("Cloning from GitHub") {
            steps {
                git url: "https://github.com/WHY-SHREYAS/emp_project.git", branch: "main"
            }
        }
        
        stage("Build") {
            steps {
                sh 'ls -la'  // Debug: List contents of the root workspace
                
                // Backend build
                dir('emp_backend') {
                    sh 'ls -la'  // Debug: List contents
                    sh 'mvn -version'  // Debug: Check Maven
                    sh 'mvn clean compile'  // Compile Java code
                }
                
                // Frontend build
                dir('employee frontend final') {
                    sh 'ls -la'
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm cache clean --force'   // Clean npm cache
                    sh 'rm -rf node_modules package-lock.json'  // Remove old deps
                    sh 'npm install'  // Fresh install
                    sh 'npm audit fix || true'
                    sh 'CI=false npm run build'  // Build React app
                }
            }
        }
        
        stage("SonarQube Quality Analysis") {
            steps {
                withSonarQubeEnv("Sonar") {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \
                        -Dsonar.projectName=Employee-Management-System \
                        -Dsonar.projectKey=Employee-Management-System \
                        -Dsonar.java.binaries=emp_backend/target/classes \
                        -Dsonar.sources=emp_backend/src/main,employee frontend final/src \
                        -Dsonar.tests=employee frontend final/src \
                        -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.test.ts,**/*.test.tsx \
                        -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/target/**
                    """
                }
            }
        }
        
        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        withCredentials([string(credentialsId: 'Sonar', variable: 'SONAR_TOKEN')]) {
                            def qgStatus = sh(
                                script: """
                                    curl -s -f -u "\$SONAR_TOKEN:" \
                                    '${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=Employee-Management-System' \
                                    | grep -o '"status":"[^"]*"' \
                                    | cut -d'"' -f4 || echo "ERROR"
                                """,
                                returnStdout: true
                            ).trim()
                            
                            def firstStatus = qgStatus.readLines()[0]
                            echo "Quality Gate status: ${firstStatus}"
                            
                            if (firstStatus == 'ERROR' || firstStatus != 'OK') {
                                error "Quality Gate failed: Coverage or other metrics did not meet requirements"
                            }
                            
                            echo "Quality Gate passed for the project"
                        }
                    }
                }
            }
        }
        
        stage("Test") {
            steps {
                script {
                    // Backend tests
                    dir('ems-backend') {
                        sh 'mvn test || true'  // Run backend tests
                    }
                    
                    // Frontend tests (if you have test scripts)
                    dir('ems-frontend') {
                        sh 'npm test -- --coverage --watchAll=false || true'
                    }
                }
                echo "Test stage completed"
            }
        }
        
        stage("Build Artifacts") {
            steps {
                script {
                    // Package backend
                    dir('ems-backend') {
                        sh 'mvn clean package -DskipTests'
                    }
                    
                    echo "Backend JAR created in ems-backend/target/"
                    echo "Frontend build available in ems-frontend/build/"
                }
            }
        }
        
        stage("Deploy") {
            steps {
                script {
                    echo "Deploy stage - Add your deployment steps here"
                    // Example deployment steps:
                    // 1. Copy JAR to deployment location
                    // 2. Deploy frontend to web server
                    // 3. Restart services
                }
            }
        }
    }
    
    post {
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed. Please check the logs."
        }
        always {
            // Clean up workspace if needed
            cleanWs(deleteDirs: true)
        }
    }
}
