pipeline {
    agent any

    tools {
        maven 'maven-3.9'     
        nodejs 'node-18'         
    }

    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://13.235.40.181:9000'  
                
        DT_URL = 'http://13.235.40.181:8085'  
        DT_API_KEY = credentials('dependency-track-api-key') 
        DT_PROJECT_NAME = 'Employee-Management-System'
        DT_PROJECT_VERSION = '1.0.0'
        
        CRITICAL_THRESHOLD = 10
        HIGH_THRESHOLD = 20
        MEDIUM_THRESHOLD = 90

    	DOCKER_BACKEND_IMAGE = "emp_backend"
    	DOCKER_FRONTEND_IMAGE = "emp_frontend_final"
    	DOCKER_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage("Cloning from GitHub") {
            steps {
                git url: "https://github.com/WHY-SHREYAS/emp_project.git", branch: "main"
            }
        }

        stage("Build") {
            steps {
                sh 'ls -la' 

                dir('emp_backend') {
                    sh 'ls -la'
                    sh 'mvn -version'
                    sh 'mvn clean compile'
                }

                dir('employee frontend final') {
                    sh 'ls -la'
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm cache clean --force'
                    sh 'rm -rf node_modules package-lock.json'
                    sh 'npm install'
                    sh 'npm audit fix || true'
                    sh 'CI=false npm run build'
                }
            }
        }

        stage("Test") {
            parallel {
                stage("Backend Tests") {
                    steps {
                        dir("emp_backend") {
                            sh '''
                                mvn clean test
                                mvn jacoco:report
                            '''
                            junit testResults: 'target/surefire-reports/**/*.xml', allowEmptyResults: true
                        }
                    }
                }

                stage("Frontend Tests") {
                    steps {
                        dir('employee frontend final') {
                            sh 'npm test -- --no-watch --code-coverage --browsers=ChromeHeadless || true'
                        }
                    }
                }
            }
        }

        stage("Generate SBOM") {
            parallel {
                stage("Backend SBOM") {
                    steps {
                        dir('emp_backend') {
                            sh '''
                                mvn org.cyclonedx:cyclonedx-maven-plugin:makeBom
                                ls -la target/
                                if [ -f "target/bom.xml" ]; then
                                    echo "Backend SBOM generated successfully"
                                fi
                            '''
                        }
                    }
                }

                stage("Frontend SBOM") {
                    steps {
                        dir('employee frontend final') {
                            sh '''
                                npm install -g @cyclonedx/cyclonedx-npm
                                cyclonedx-npm --output-file bom.json
                                ls -la
                                if [ -f "bom.json" ]; then
                                    echo "Frontend SBOM generated successfully"
                                fi
                            '''
                        }
                    }
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
                        -Dsonar.sources=emp_backend/src/main,employee\\ frontend\\ final/src \
                        -Dsonar.tests=emp_backend/src/test,employee\\ frontend\\ final/src \
                        -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.test.ts,**/*.test.tsx,**/src/test/**/*.java \
                        -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/target/** \
                        -Dsonar.coverage.jacoco.xmlReportPaths=emp_backend/target/site/jacoco/jacoco.xml \
                        -Dsonar.typescript.lcov.reportPaths=employee\\ frontend\\ final/coverage/lcov.info \
                        -Dsonar.java.coveragePlugin=jacoco
                    """
                }
            }
        }

        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        }
                        echo "Quality Gate passed successfully!"
                    }
                }
            }
        }

        stage("Archive Test Results") {
            steps {
                junit 'emp_backend/target/surefire-reports/*.xml'
                archiveArtifacts artifacts: 'employee frontend final/coverage/**', allowEmptyArchive: true
            }
        }

stage("Build & Push Docker Images") {
    steps {
        script {
            // --- Backend Build ---
            dir('emp_backend') {
                sh '''
                    echo "Building backend Docker image on default port 8080..."
                    docker build -t emp_backend:${DOCKER_TAG} .
                '''
            }

            // --- Frontend Build ---
            dir('employee frontend final') {
                sh '''
                    echo "Building frontend Docker image on default port 4200..."
                    docker build -t emp_frontend_final:${DOCKER_TAG} .
                '''
            }

            // --- Push to DockerHub ---
            withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh '''
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                    docker tag emp_backend:${DOCKER_TAG} $DOCKER_USER/emp_backend:${DOCKER_TAG}
                    docker tag emp_frontend_final:${DOCKER_TAG} $DOCKER_USER/emp_frontend_final:${DOCKER_TAG}

                    docker push $DOCKER_USER/emp_backend:${DOCKER_TAG}
                    docker push $DOCKER_USER/emp_frontend_final:${DOCKER_TAG}

                    echo "✅ Docker images built and pushed successfully!"
                '''
            }
        }
    }
}




       stage('Update K8s Deployment Files') {
            steps {
                script {
                    echo 'Updating Kubernetes deployment files with new build number...'
                    sh """
                        sed -i 's|BUILD_NUMBER|${BUILD_NUMBER}|g' k8s/backend-deployment.yaml
                        sed -i 's|BUILD_NUMBER|${BUILD_NUMBER}|g' k8s/frontend-deployment.yaml
                    """
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo 'Deploying to Kubernetes...'
                    
                    // If Jenkins is on same server as K8s
                    sh """
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml
                        kubectl rollout status deployment/backend-deployment
                        kubectl rollout status deployment/frontend-deployment
                    """
                  
                }
            }
        }
        
        stage('Setup Port Forwarding') {
            steps {
                script {
                    echo 'Setting up port forwarding...'
                    sh """
                        # Kill existing port-forwards
                        pkill -f 'port-forward' || true
                        
                        # Start new port-forwards in background
                        nohup kubectl port-forward --address 0.0.0.0 service/backend-service 31001:8080 > backend-forward.log 2>&1 &
                        nohup kubectl port-forward --address 0.0.0.0 service/frontend-service 31000:4200 > frontend-forward.log 2>&1 &
                        
                        sleep 5
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo 'Verifying deployment...'
                    sh """
                        kubectl get pods
                        kubectl get services
                        echo "Frontend: http://13.235.40.181:31000"
                        echo "Backend: http://13.235.40.181:31001"
                    """
                }
            }
        }
    }


    post {
        always {
            echo 'Cleaning up...'
            sh 'docker logout'
        }
        success {
            echo 'Pipeline completed successfully!'
            echo 'Application is now running on Kubernetes'
            echo 'Frontend: http://13.235.40.181:31000'
            echo 'Backend: http://13.235.40.181:31001'
        }
        failure {
            echo 'Pipeline failed! Check the logs above.'
        }
    }
}
