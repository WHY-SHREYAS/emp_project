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


                stage("Upload SBOM to Dependency-Track") {
            steps {
                script {
                    echo "Uploading Backend SBOM..."
                    // Upload Backend SBOM (XML format)
                    sh "curl -X POST -H \"X-Api-Key: ${DT_API_KEY}\" -F \"project=${DT_PROJECT_NAME}\" -F \"version=${DT_PROJECT_VERSION}\" -F \"bom=@emp_backend/target/bom.xml\" ${DT_URL}/api/v1/bom"

                    echo "Uploading Frontend SBOM..."
                    // Upload Frontend SBOM (JSON format)
                    sh "curl -X POST -H \"X-Api-Key: ${DT_API_KEY}\" -F \"project=${DT_PROJECT_NAME}\" -F \"version=${DT_PROJECT_VERSION}\" -F \"bom=@employee\\ frontend\\ final/bom.json\" ${DT_URL}/api/v1/bom"
                }
            }
        }

        stage("Dependency-Track Quality Gate") {
            steps {
                script {
                    // Use Dependency-Track API to fetch project metrics
                    def project_metrics = sh(
                        script: "curl -s -X GET -H \"X-Api-Key: ${DT_API_KEY}\" ${DT_URL}/api/v1/metrics/project/${DT_PROJECT_NAME}/${DT_PROJECT_VERSION}/current",
                        returnStdout: true
                    ).trim()

                    def jsonSlurper = new groovy.json.JsonSlurper()
                    def metrics = jsonSlurper.parseText(project_metrics).find { it.project == DT_PROJECT_NAME && it.version == DT_PROJECT_VERSION }

                    if (metrics) {
                        def critical_vulns = metrics.vulnerabilities.critical as int
                        def high_vulns = metrics.vulnerabilities.high as int
                        def medium_vulns = metrics.vulnerabilities.medium as int

                        echo "Dependency-Track Vulnerabilities Found:"
                        echo "  - Critical: ${critical_vulns} (Threshold: ${CRITICAL_THRESHOLD})"
                        echo "  - High: ${high_vulns} (Threshold: ${HIGH_THRESHOLD})"
                        echo "  - Medium: ${medium_vulns} (Threshold: ${MEDIUM_THRESHOLD})"

                        if (critical_vulns > CRITICAL_THRESHOLD || high_vulns > HIGH_THRESHOLD || medium_vulns > MEDIUM_THRESHOLD) {
                            error "Dependency-Track Quality Gate Failed! Vulnerability count exceeds defined thresholds."
                        } else {
                            echo "Dependency-Track Quality Gate Passed! Vulnerability counts are within acceptable limits."
                        }
                    } else {
                        // This might happen if the analysis is not complete or project name/version is wrong
                        error "Could not retrieve Dependency-Track metrics. Check project name, version, and server logs."
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
            dir('emp_backend') {
                sh '''
                    echo "Building backend Docker image..."
                    docker build -t emp_backend:${DOCKER_TAG} .
                '''
            }

            dir('employee frontend final') {
                sh '''
                    echo "Building frontend Docker image..."
                    docker build -t emp_frontend_final:${DOCKER_TAG} .
                '''
            }

            withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh '''
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                    docker tag emp_backend:${DOCKER_TAG} $DOCKER_USER/emp_backend:${DOCKER_TAG}
                    docker tag emp_frontend_final:${DOCKER_TAG} $DOCKER_USER/emp_frontend_final:${DOCKER_TAG}

                    docker push $DOCKER_USER/emp_backend:${DOCKER_TAG}
                    docker push $DOCKER_USER/emp_frontend_final:${DOCKER_TAG}

                    echo "Docker images pushed successfully!"
                '''
            }
        }
    }


   post {
        success {
            echo "Pipeline completed successfully!"
            echo "Docker images are available on DockerHub"
        }
        failure {
            echo "Pipeline failed! Check logs for details."
        }
        always {
            echo "Cleaning up workspace..."
            cleanWs()
        }
    }
}
    }}
