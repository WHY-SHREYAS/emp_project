pipeline {
    agent any

    tools {
        maven 'maven-3.9'     
        nodejs 'node-18'         
    }

    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://13.235.40.181:9000'  
                
        DT_URL = 'http://65.0.13.40:8080'  
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

        stage("Upload SBOMs to Dependency-Track") {
            parallel {
                stage("Upload Backend SBOM") {
                    steps {
                        dir('emp_backend') {
                            script {
                                def bomContent = readFile('target/bom.xml')
                                def bomBase64 = Base64.getEncoder().encodeToString(bomContent.getBytes())
                                
                                withCredentials([string(credentialsId: 'dependency-track-api-key', variable: 'API_KEY')]) {
                                    def response = sh(
                                        script: '''
                                            curl -X POST "''' + DT_URL + '''/api/v1/bom" \\
                                              -H "Content-Type: application/json" \\
                                              -H "X-Api-Key: $API_KEY" \\
                                              -d \'{"project":"''' + DT_PROJECT_NAME + '''","projectVersion":"''' + DT_PROJECT_VERSION + '''","autoCreate":true,"bom":"''' + bomBase64 + '''"}\' \\
                                              -w "%{http_code}" \\
                                              -o response.json
                                        ''',
                                        returnStdout: true
                                    ).trim()
                                    
                                    if (response == '200') {
                                        echo "✅ Backend SBOM uploaded successfully"
                                    } else {
                                        error "❌ Failed to upload Backend SBOM. HTTP Status: ${response}"
                                    }
                                }
                            }
                        }
                    }
                }
                
                stage("Upload Frontend SBOM") {
                    steps {
                        dir('employee frontend final') {
                            script {
                                def bomContent = readFile('bom.json')
                                def bomBase64 = Base64.getEncoder().encodeToString(bomContent.getBytes())
                                
                                withCredentials([string(credentialsId: 'dependency-track-api-key', variable: 'API_KEY')]) {
                                    def response = sh(
                                        script: '''
                                            curl -X POST "''' + DT_URL + '''/api/v1/bom" \\
                                              -H "Content-Type: application/json" \\
                                              -H "X-Api-Key: $API_KEY" \\
                                              -d \'{"project":"''' + DT_PROJECT_NAME + '''","projectVersion":"''' + DT_PROJECT_VERSION + '''","autoCreate":true,"bom":"''' + bomBase64 + '''"}\' \\
                                              -w "%{http_code}" \\
                                              -o response.json
                                        ''',
                                        returnStdout: true
                                    ).trim()
                                    
                                    if (response == '200') {
                                        echo "✅ Frontend SBOM uploaded successfully"
                                    } else {
                                        error "❌ Failed to upload Frontend SBOM. HTTP Status: ${response}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        stage("Wait for Analysis") {
            steps {
                script {
                    echo "⏳ Waiting for Dependency-Track to process SBOMs..."
                    sleep(time: 30, unit: 'SECONDS')
                }
            }
        }

        stage("Check Vulnerabilities") {
            steps {
                script {
                    echo "🔍 Fetching vulnerability metrics from Dependency-Track..."
                    
                    def projectUuid = sh(
                        script: """
                            curl -s -X GET '${DT_URL}/api/v1/project/lookup?name=${DT_PROJECT_NAME}&version=${DT_PROJECT_VERSION}' \\
                              -H 'X-Api-Key: ${DT_API_KEY}' | jq -r '.uuid'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (projectUuid == 'null' || projectUuid == '') {
                        error "❌ Project not found in Dependency-Track"
                    }
                    
                    echo "📦 Project UUID: ${projectUuid}"
                    
                    def metricsJson = sh(
                        script: """
                            curl -s -X GET '${DT_URL}/api/v1/metrics/project/${projectUuid}/current' \\
                              -H 'X-Api-Key: ${DT_API_KEY}'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    def metrics = readJSON text: metricsJson
                    
                    def critical = metrics.critical ?: 0
                    def high = metrics.high ?: 0
                    def medium = metrics.medium ?: 0
                    def low = metrics.low ?: 0
                    
                    echo """
┌─────────────────────────────────────────────┐
│     Vulnerability Scan Results              │
├─────────────────────────────────────────────┤
│ 🔴 Critical:  ${critical} (Threshold: ${CRITICAL_THRESHOLD})        │
│ 🟠 High:      ${high} (Threshold: ${HIGH_THRESHOLD})        │
│ 🟡 Medium:    ${medium} (Threshold: ${MEDIUM_THRESHOLD})       │
│ 🟢 Low:       ${low}                         │
└─────────────────────────────────────────────┘
                    """
                    
                    def violations = []
                    
                    if (critical > CRITICAL_THRESHOLD.toInteger()) {
                        violations.add("🔴 Critical: ${critical} (exceeds ${CRITICAL_THRESHOLD})")
                    }
                    
                    if (high > HIGH_THRESHOLD.toInteger()) {
                        violations.add("🟠 High: ${high} (exceeds ${HIGH_THRESHOLD})")
                    }
                    
                    if (medium > MEDIUM_THRESHOLD.toInteger()) {
                        violations.add("🟡 Medium: ${medium} (exceeds ${MEDIUM_THRESHOLD})")
                    }
                    
                    if (violations.size() > 0) {
                        def violationMsg = violations.join('\n')
                        echo """
❌ BUILD FAILED - Vulnerability thresholds exceeded:

${violationMsg}

🔗 View details: ${DT_URL}/projects/${projectUuid}
                        """
                        error("Build rejected due to excessive vulnerabilities")
                    } else {
                        echo """
✅ All vulnerability thresholds passed!

🔗 View full report: ${DT_URL}/projects/${projectUuid}
                        """
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
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
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
